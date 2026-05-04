import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'
import { mapFanslyChatMessages, mapFanslyChatRowToThreadMessage } from '@/lib/messages/fansly-thread-map'
import { resolveFanslyChat } from '@/lib/fansly/resolve-fansly-chat'
import { validateFanslyChatMediaIdsForSend } from '@/lib/fansly/chat-media-validate'
import {
  consumeAiCredits,
  hasEnoughAiCredits,
  insufficientAiCreditsResponse,
} from '@/lib/billing/consume-ai-credits'
import { CREDITS_MESSAGE_SEND_PLATFORM } from '@/lib/billing/credit-economics'
import { logMessageSendEvent } from '@/lib/usage/log-message-send'
import { bumpSubscriptionMessagesSent } from '@/lib/usage/bump-messages-sent'

/**
 * `fanId` is the **fan’s user id** (matches inbox / deep links) or the **Fansly chat id**.
 * Optional query `peerUserId` helps bubble direction when the path is already the chat id.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fanId: string }> }) {
  try {
    const { fanId: rawFanId } = await params
    const fanId = decodeURIComponent(rawFanId)
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'Fansly not connected' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '100', 10)), 100)
    const before = searchParams.get('before') || undefined
    const peerFromQuery = searchParams.get('peerUserId')?.trim()

    const api = createFanslyAPI(connection.access_token)
    const resolved = await resolveFanslyChat(api, fanId)
    if (!resolved) {
      return NextResponse.json({ error: 'Chat not found for this Fansly account.' }, { status: 404 })
    }

    const peerUserId = peerFromQuery || resolved.peerUserId
    const result = await api.getMessages(resolved.chatId, { limit, before })
    const messages = mapFanslyChatMessages(result.data, { fanUserId: peerUserId })

    return NextResponse.json({ messages, source: 'fansly' })
  } catch (error) {
    console.error('[fansly/messages] GET', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load messages' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ fanId: string }> }) {
  try {
    const { fanId: rawFanId } = await params
    const fanId = decodeURIComponent(rawFanId)
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    const accountId =
      (connection?.access_token != null && String(connection.access_token).trim() !== ''
        ? String(connection.access_token).trim()
        : null) ??
      (connection?.platform_user_id != null && String(connection.platform_user_id).trim() !== ''
        ? String(connection.platform_user_id).trim()
        : null)

    if (!accountId) {
      return NextResponse.json({ error: 'Fansly not connected' }, { status: 400 })
    }

    const body = await request.json()
    const { text, mediaIds, price } = body as {
      text?: string
      mediaIds?: (string | number)[]
      price?: number
    }
    const trimmed = typeof text === 'string' ? text.trim() : ''
    const hasText = trimmed.length > 0
    const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0

    if (!hasText && !hasMedia) {
      return NextResponse.json({ error: 'Message text or media required' }, { status: 400 })
    }

    if (typeof price === 'number' && price > 0 && !hasMedia) {
      return NextResponse.json(
        { error: 'Paid messages must include at least one media file.' },
        { status: 400 },
      )
    }

    const mediaErr = validateFanslyChatMediaIdsForSend(mediaIds)
    if (mediaErr) {
      return NextResponse.json({ error: mediaErr }, { status: 400 })
    }

    const api = createFanslyAPI(accountId)
    const resolved = await resolveFanslyChat(api, fanId)
    if (!resolved) {
      return NextResponse.json({ error: 'Chat not found for this Fansly account.' }, { status: 404 })
    }

    const check = await hasEnoughAiCredits(supabase, user.id, CREDITS_MESSAGE_SEND_PLATFORM)
    if (!check.ok) return insufficientAiCreditsResponse(check.used, check.limit)

    const sendPayload = await api.sendMessage(accountId, resolved.chatId, {
      text: trimmed || '',
      mediaIds: hasMedia ? mediaIds!.map((id) => String(id)) : undefined,
      price: typeof price === 'number' && price > 0 ? price : undefined,
    })

    const mapped =
      mapFanslyChatRowToThreadMessage(sendPayload, { fanUserId: resolved.peerUserId }) ??
      ({
        id: String(sendPayload.id ?? Date.now()),
        fromUser: { id: user.id, name: 'You' },
        text: trimmed,
        createdAt: new Date().toISOString(),
        isSentByMe: true,
      } as const)

    const reasonRef = `fansly_send:${resolved.chatId}:${String(mapped.id)}`
    const debit = await consumeAiCredits(supabase, user.id, CREDITS_MESSAGE_SEND_PLATFORM, {
      reasonCode: 'message_send_platform',
      reasonRef,
      idempotencyKey: `${reasonRef}:${user.id}`,
      metadata: {
        endpoint: '/api/fansly/messages/[fanId]',
        chat_id: resolved.chatId,
      },
    })
    if (!debit.ok) return insufficientAiCreditsResponse(debit.used, debit.limit)

    logMessageSendEvent({
      userId: user.id,
      platform: 'fansly',
      fanId: resolved.peerUserId,
      source: 'chat_dm',
      metadata: { hasMedia, hasPrice: typeof price === 'number' && price > 0 },
    })
    bumpSubscriptionMessagesSent(user.id, 1)

    return NextResponse.json({
      success: true,
      message: mapped,
    })
  } catch (error) {
    console.error('[fansly/messages] POST', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 },
    )
  }
}
