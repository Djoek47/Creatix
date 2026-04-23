import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { validateChatMediaIdsForSend } from '@/lib/onlyfans-chat-media'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'
import {
  CREDITS_MESSAGE_SEND_PLATFORM,
  getCreditsForToolId,
} from '@/lib/billing/credit-economics'
import {
  consumeAiCredits,
  hasEnoughAiCredits,
  insufficientAiCreditsResponse,
} from '@/lib/billing/consume-ai-credits'
import { createAriadneTraceExport } from '@/lib/ariadne/create-ariadne-trace-export'
import { bumpSubscriptionMessagesSent } from '@/lib/usage/bump-messages-sent'
import { logMessageSendEvent } from '@/lib/usage/log-message-send'

type CampaignTarget = {
  fanId: string
  platform: 'onlyfans' | 'fansly'
  message: string
  price?: number | null
  username?: string | null
  displayName?: string | null
}

type CampaignExecuteBody = {
  mode?: 'broadcast' | 'personalized'
  targets?: CampaignTarget[]
  message?: string
  price?: number
  mediaIds?: (string | number)[]
  previews?: (string | number)[]
  trace?: {
    enabled?: boolean
    contentId?: string
    contentIds?: string[]
    recipientKeyPrefix?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as CampaignExecuteBody
    const mode = body.mode === 'broadcast' ? 'broadcast' : 'personalized'
    const targets = Array.isArray(body.targets)
      ? body.targets
          .map((t) => ({
            fanId: String(t.fanId ?? '').trim(),
            platform: t.platform === 'fansly' ? 'fansly' : 'onlyfans',
            message: String(t.message ?? '').trim(),
            price:
              typeof t.price === 'number' && Number.isFinite(t.price) && t.price >= 0
                ? Math.round(t.price * 100) / 100
                : null,
            username: t.username ? String(t.username).trim() : null,
            displayName: t.displayName ? String(t.displayName).trim() : null,
          }))
          .filter((t) => t.fanId && t.message)
      : []

    if (mode === 'personalized' && targets.length === 0) {
      return NextResponse.json({ error: 'No personalized targets provided' }, { status: 400 })
    }

    const traceEnabled = Boolean(body.trace?.enabled)
    const traceContentIds = Array.isArray(body.trace?.contentIds)
      ? body.trace?.contentIds.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
    const fallbackContentId = String(body.trace?.contentId ?? '').trim()
    const activeTraceContentIds = traceContentIds.length > 0 ? traceContentIds : fallbackContentId ? [fallbackContentId] : []
    if (traceEnabled && activeTraceContentIds.length === 0) {
      return NextResponse.json({ error: 'Trace content is required when trace is enabled.' }, { status: 400 })
    }

    const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds : []
    const previews = Array.isArray(body.previews) ? body.previews : []
    const hasMedia = mediaIds.length > 0
    const mediaErr = validateChatMediaIdsForSend(mediaIds)
    if (mediaErr) return NextResponse.json({ error: mediaErr }, { status: 400 })
    if (previews.length > 0 && !hasMedia) {
      return NextResponse.json({ error: 'Preview media requires media files.' }, { status: 400 })
    }

    const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
    if (billingBlock) return billingBlock

    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .in('platform', ['onlyfans', 'fansly'])
    const ofConn = (connections || []).find((c) => c.platform === 'onlyfans')
    if (!ofConn) return NextResponse.json({ error: 'OnlyFans is not connected.' }, { status: 400 })

    const personalizedTargets = targets.filter((t) => t.platform === 'onlyfans')
    const sendCreditsEstimate = personalizedTargets.length * CREDITS_MESSAGE_SEND_PLATFORM
    const traceCreditsEstimate =
      traceEnabled && personalizedTargets.length > 0
        ? personalizedTargets.length * activeTraceContentIds.length * getCreditsForToolId('ariadne-trace')
        : 0
    const gate = await hasEnoughAiCredits(supabase, user.id, sendCreditsEstimate + traceCreditsEstimate)
    if (!gate.ok) return insufficientAiCreditsResponse(gate.used, gate.limit)

    const api = createOnlyFansAPI(ofConn.access_token)
    const results: Array<{
      fanId: string
      platform: 'onlyfans'
      success: boolean
      messageId?: string
      error?: string
      trace?: Array<{ payloadId: string; exportId: string; downloadUrl: string; creditsCharged: number }> | null
    }> = []

    let sent = 0
    let failed = 0
    let traceGenerated = 0
    let traceFailed = 0

    for (const target of personalizedTargets) {
      try {
        // OF paid-message requirement.
        if (typeof target.price === 'number' && target.price > 0 && !hasMedia) {
          results.push({
            fanId: target.fanId,
            platform: 'onlyfans',
            success: false,
            error: 'Paid messages require media files.',
          })
          failed += 1
          continue
        }

        const messageOut = await api.sendMessage(target.fanId, {
          text: target.message,
          mediaFiles: hasMedia ? mediaIds : undefined,
          previews: previews.length > 0 ? previews : undefined,
          price: typeof target.price === 'number' ? target.price : undefined,
        })

        const sendReasonRef = `mass_campaign_send:${target.fanId}:${String(messageOut.id ?? '')}`
        const sendDebit = await consumeAiCredits(supabase, user.id, CREDITS_MESSAGE_SEND_PLATFORM, {
          reasonCode: 'mass_campaign_send',
          reasonRef: sendReasonRef,
          idempotencyKey: `${sendReasonRef}:${user.id}`,
          metadata: {
            endpoint: '/api/messages/mass/campaign-execute',
            fan_id: target.fanId,
          },
        })
        if (!sendDebit.ok) return insufficientAiCreditsResponse(sendDebit.used, sendDebit.limit)

        let traceOut: Array<{ payloadId: string; exportId: string; downloadUrl: string; creditsCharged: number }> = []

        if (traceEnabled) {
          const prefix =
            typeof body.trace?.recipientKeyPrefix === 'string' && body.trace.recipientKeyPrefix.trim()
              ? body.trace.recipientKeyPrefix.trim()
              : 'mass'
          for (const traceContentId of activeTraceContentIds) {
            const createdTrace = await createAriadneTraceExport({
              supabase,
              userId: user.id,
              contentId: traceContentId,
              recipientKey: `${prefix}:${target.fanId}`,
              source: 'mass_dm',
              recipient: {
                platform: 'onlyfans',
                platformFanId: target.fanId,
                username: target.username ?? undefined,
                displayName: target.displayName ?? undefined,
              },
              origin: {
                messageId: messageOut.id != null ? String(messageOut.id) : undefined,
              },
              updateContentRow: false,
            })
            if (createdTrace.ok) {
              traceOut.push({
                payloadId: createdTrace.payloadId,
                exportId: createdTrace.exportId,
                downloadUrl: createdTrace.downloadUrl,
                creditsCharged: createdTrace.creditsCharged,
              })
              traceGenerated += 1
            } else {
              traceFailed += 1
            }
          }
        }

        results.push({
          fanId: target.fanId,
          platform: 'onlyfans',
          success: true,
          messageId: messageOut.id != null ? String(messageOut.id) : undefined,
          trace: traceOut.length > 0 ? traceOut : null,
        })
        sent += 1
      } catch (e) {
        failed += 1
        results.push({
          fanId: target.fanId,
          platform: 'onlyfans',
          success: false,
          error: e instanceof Error ? e.message : 'Send failed',
        })
      }
    }

    if (sent > 0) {
      logMessageSendEvent({
        userId: user.id,
        platform: 'onlyfans',
        source: mode === 'personalized' ? 'mass_campaign_personalized' : 'mass_dm',
        metadata: {
          sent,
          failed,
          traceEnabled,
          traceGenerated,
          traceFailed,
          mode,
        },
      })
      bumpSubscriptionMessagesSent(user.id, sent)
    }

    return NextResponse.json({
      success: failed === 0,
      mode,
      sent,
      failed,
      results,
      trace: {
        enabled: traceEnabled,
        generated: traceGenerated,
        failed: traceFailed,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to execute campaign' },
      { status: 500 },
    )
  }
}
