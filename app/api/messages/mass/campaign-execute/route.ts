import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createFanslyAPI } from '@/lib/fansly-api'
import { validateChatMediaIdsForSend } from '@/lib/onlyfans-chat-media'
import { validateFanslyChatMediaIdsForSend } from '@/lib/fansly/chat-media-validate'
import { resolveFanslyChat } from '@/lib/fansly/resolve-fansly-chat'
import { validateFanslyPpvForSend } from '@/lib/fansly/ppv-send'
import {
  FANSLY_MASS_OTP_COOKIE,
  isFanslyMassOtpEnforced,
  verifyFanslyMassOtpCookieValue,
} from '@/lib/fansly/mass-otp-cookie'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'
import { CREDITS_MESSAGE_SEND_PLATFORM } from '@/lib/billing/credit-economics'
import {
  consumeAiCredits,
  hasEnoughAiCredits,
  insufficientAiCreditsResponse,
} from '@/lib/billing/consume-ai-credits'
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
  /** Fansly vault / media ids for personalized Fansly sends (not OnlyFans upload ids). */
  fanslyMediaIds?: (string | number)[]
}

function fanslyAccountId(conn: { access_token?: string | null; platform_user_id?: string | null }): string | null {
  const a =
    (conn.access_token != null && String(conn.access_token).trim() !== ''
      ? String(conn.access_token).trim()
      : null) ??
    (conn.platform_user_id != null && String(conn.platform_user_id).trim() !== ''
      ? String(conn.platform_user_id).trim()
      : null)
  return a
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

    const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds : []
    const fanslyMediaIds = Array.isArray(body.fanslyMediaIds) ? body.fanslyMediaIds : []
    const previews = Array.isArray(body.previews) ? body.previews : []
    const hasOfMedia = mediaIds.length > 0
    const hasFlMedia = fanslyMediaIds.length > 0

    if (hasOfMedia) {
      const mediaErr = validateChatMediaIdsForSend(mediaIds)
      if (mediaErr) return NextResponse.json({ error: mediaErr }, { status: 400 })
    }
    if (hasFlMedia) {
      const flErr = validateFanslyChatMediaIdsForSend(fanslyMediaIds)
      if (flErr) return NextResponse.json({ error: flErr }, { status: 400 })
    }
    if (previews.length > 0 && !hasOfMedia) {
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
    const flConn = (connections || []).find((c) => c.platform === 'fansly')

    const personalizedOf = targets.filter((t) => t.platform === 'onlyfans')
    const personalizedFl = targets.filter((t) => t.platform === 'fansly')

    if (personalizedOf.length > 0 && !ofConn?.access_token) {
      return NextResponse.json({ error: 'OnlyFans is not connected.' }, { status: 400 })
    }
    if (personalizedFl.length > 0 && !fanslyAccountId(flConn ?? {})) {
      return NextResponse.json({ error: 'Fansly is not connected.' }, { status: 400 })
    }

    if (personalizedFl.length > 0 && isFanslyMassOtpEnforced()) {
      const ok = verifyFanslyMassOtpCookieValue(request.cookies.get(FANSLY_MASS_OTP_COOKIE)?.value, user.id)
      if (!ok) {
        return NextResponse.json(
          {
            error:
              'Fansly two-factor verification required before campaign sends. Complete email OTP verification in Fansly settings, then retry.',
            code: 'FANSLY_MASS_OTP_REQUIRED',
          },
          { status: 403 },
        )
      }
    }

    const sendCreditsEstimate =
      (personalizedOf.length + personalizedFl.length) * CREDITS_MESSAGE_SEND_PLATFORM
    const gate = await hasEnoughAiCredits(supabase, user.id, sendCreditsEstimate)
    if (!gate.ok) return insufficientAiCreditsResponse(gate.used, gate.limit)

    const ofApi = ofConn?.access_token ? createOnlyFansAPI(ofConn.access_token) : null
    const flAccountId = flConn ? fanslyAccountId(flConn) : null
    const flApi = flAccountId ? createFanslyAPI(flAccountId) : null

    const results: Array<{
      fanId: string
      platform: 'onlyfans' | 'fansly'
      success: boolean
      messageId?: string
      error?: string
    }> = []

    let sent = 0
    let failed = 0

    for (const target of personalizedOf) {
      if (!ofApi) continue
      try {
        if (typeof target.price === 'number' && target.price > 0 && !hasOfMedia) {
          results.push({
            fanId: target.fanId,
            platform: 'onlyfans',
            success: false,
            error: 'Paid messages require media files.',
          })
          failed += 1
          continue
        }

        const messageOut = await ofApi.sendMessage(target.fanId, {
          text: target.message,
          mediaFiles: hasOfMedia ? mediaIds : undefined,
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
            platform: 'onlyfans',
          },
        })
        if (!sendDebit.ok) return insufficientAiCreditsResponse(sendDebit.used, sendDebit.limit)

        results.push({
          fanId: target.fanId,
          platform: 'onlyfans',
          success: true,
          messageId: messageOut.id != null ? String(messageOut.id) : undefined,
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

    for (const target of personalizedFl) {
      if (!flApi || !flAccountId) continue
      try {
        const ppvErr = validateFanslyPpvForSend(
          typeof target.price === 'number' ? target.price : undefined,
          hasFlMedia,
        )
        if (ppvErr) {
          results.push({
            fanId: target.fanId,
            platform: 'fansly',
            success: false,
            error: ppvErr,
          })
          failed += 1
          continue
        }

        const resolved = await resolveFanslyChat(flApi, target.fanId)
        if (!resolved) {
          failed += 1
          results.push({
            fanId: target.fanId,
            platform: 'fansly',
            success: false,
            error: 'Chat not found for this Fansly account.',
          })
          continue
        }

        const sendPayload = await flApi.sendMessage(flAccountId, resolved.chatId, {
          text: target.message,
          mediaIds: hasFlMedia ? fanslyMediaIds.map((id) => String(id)) : undefined,
          price: typeof target.price === 'number' && target.price > 0 ? target.price : undefined,
        })

        const sendReasonRef = `mass_campaign_send_fansly:${target.fanId}:${String(sendPayload.id ?? '')}`
        const sendDebit = await consumeAiCredits(supabase, user.id, CREDITS_MESSAGE_SEND_PLATFORM, {
          reasonCode: 'mass_campaign_send',
          reasonRef: sendReasonRef,
          idempotencyKey: `${sendReasonRef}:${user.id}`,
          metadata: {
            endpoint: '/api/messages/mass/campaign-execute',
            fan_id: target.fanId,
            platform: 'fansly',
          },
        })
        if (!sendDebit.ok) return insufficientAiCreditsResponse(sendDebit.used, sendDebit.limit)

        results.push({
          fanId: target.fanId,
          platform: 'fansly',
          success: true,
          messageId: sendPayload.id != null ? String(sendPayload.id) : undefined,
        })
        sent += 1
      } catch (e) {
        failed += 1
        results.push({
          fanId: target.fanId,
          platform: 'fansly',
          success: false,
          error: e instanceof Error ? e.message : 'Send failed',
        })
      }
    }

    if (sent > 0) {
      const platformsHit = new Set<'onlyfans' | 'fansly'>()
      for (const r of results) {
        if (r.success) platformsHit.add(r.platform)
      }
      logMessageSendEvent({
        userId: user.id,
        platform: platformsHit.size > 1 ? 'multi' : platformsHit.has('fansly') ? 'fansly' : 'onlyfans',
        source: mode === 'personalized' ? 'mass_campaign_personalized' : 'mass_dm',
        metadata: {
          sent,
          failed,
          mode,
          platforms: [...platformsHit],
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
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to execute campaign' },
      { status: 500 },
    )
  }
}
