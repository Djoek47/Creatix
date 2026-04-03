/**
 * POST /api/onlyfans/scan-chats-to-crm
 * Two steps (stateless): list platform fan ids from a page of DM chats, then batch-fetch
 * /fans/{id} and upsert subscription + spend into `fans` so the CRM fills without opening each thread.
 */
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI, isOnlyFansRateLimitError } from '@/lib/onlyfans-api'
import { partnerFanLikeFromUnknown } from '@/lib/onlyfans/partner-fan-from-payload'
import { upsertOnlyFansFanToCrm } from '@/lib/onlyfans/upsert-crm-fan-row'
import {
  ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE,
  onlyFansBillingGateResponse,
} from '@/lib/onlyfans-api-route'
import { clearOnlyFansDmMessageCacheForUser } from '@/lib/messages/of-dm-cache'

export const maxDuration = 120

const CHAT_PAGE = 50
const DEFAULT_BATCH = 12

type FetchPageBody = { step: 'fetch_page'; conversationOffset?: number }
type DetailBatchBody = { step: 'detail_batch'; platformFanIds: string[]; batchSize?: number }
type Body = FetchPageBody | DetailBatchBody

async function disconnectExpired(supabase: SupabaseClient, userId: string) {
  await supabase
    .from('platform_connections')
    .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
  await clearOnlyFansDmMessageCacheForUser(supabase, userId)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as Partial<Body>
    const step = body.step

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    if (step === 'fetch_page') {
      const conversationOffset = Math.max(0, Number((body as FetchPageBody).conversationOffset) || 0)
      const result = await api.getConversations({
        limit: CHAT_PAGE,
        offset: conversationOffset,
        order: 'recent',
      })
      const chats = result.conversations || []
      const seen = new Set<string>()
      const fanIds: string[] = []
      for (const c of chats) {
        const uid = c.user?.id
        if (!uid) continue
        const id = String(uid).trim()
        if (!id || seen.has(id)) continue
        seen.add(id)
        fanIds.push(id)
      }
      const fullPage = chats.length >= CHAT_PAGE
      const nextConversationOffset = conversationOffset + chats.length
      const done = !fullPage
      return NextResponse.json({
        fanIds,
        nextConversationOffset,
        done,
        chatsOnPage: chats.length,
      })
    }

    if (step === 'detail_batch') {
      const ids = Array.isArray((body as DetailBatchBody).platformFanIds)
        ? (body as DetailBatchBody).platformFanIds.map((x) => String(x).trim()).filter(Boolean)
        : []
      const batchSize = Math.min(
        25,
        Math.max(1, Number((body as DetailBatchBody).batchSize) || DEFAULT_BATCH),
      )
      if (ids.length === 0) {
        return NextResponse.json({ processed: 0, failed: 0, remainingFanIds: [], errors: [] })
      }

      const slice = ids.slice(0, batchSize)
      const remainingFanIds = ids.slice(batchSize)
      let processed = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < slice.length; i++) {
        const fanId = slice[i]!
        try {
          const raw = await api.getFanDetailRaw(fanId)
          const like = partnerFanLikeFromUnknown(raw)
          if (!like) {
            failed++
            if (errors.length < 5) errors.push(`${fanId}: unparseable fan payload`)
            continue
          }
          const up = await upsertOnlyFansFanToCrm(supabase, user.id, like)
          if (up.ok) processed++
          else {
            failed++
            if (errors.length < 5) errors.push(`${fanId}: ${up.error ?? 'upsert failed'}`)
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'request failed'
          if (isOnlyFansRateLimitError(msg)) {
            const restOfBatch = slice.slice(i)
            return NextResponse.json(
              {
                error: 'OnlyFans API rate limit — wait a minute and run the scan again.',
                code: 'ONLYFANS_RATE_LIMIT',
                processed,
                failed,
                remainingFanIds: [...restOfBatch, ...remainingFanIds],
                errors,
              },
              { status: 429 },
            )
          }
          failed++
          if (errors.length < 5) errors.push(`${fanId}: ${msg}`)
        }
      }

      return NextResponse.json({
        processed,
        failed,
        remainingFanIds,
        errors,
      })
    }

    return NextResponse.json({ error: 'Invalid step (use fetch_page or detail_batch)' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed'
    if (message.includes('ONLYFANS_SESSION_EXPIRED')) {
      try {
        const supabase = await createRouteHandlerClient(request)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) await disconnectExpired(supabase, user.id)
      } catch {
        /* best-effort */
      }
      return NextResponse.json(
        {
          error: 'OnlyFans session expired; reconnect OnlyFans and try again.',
          code: 'ONLYFANS_SESSION_EXPIRED',
        },
        { status: 401 },
      )
    }
    if (isOnlyFansRateLimitError(message)) {
      return NextResponse.json(
        { error: 'OnlyFans API rate limit — wait and retry.', code: 'ONLYFANS_RATE_LIMIT' },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
