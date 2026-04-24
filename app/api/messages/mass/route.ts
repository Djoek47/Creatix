/**
 * Mass messaging across platforms (Fansly / OnlyFans).
 *
 * **Consumers:** web dashboard, PWA, Capacitor WebView, future native clients — call this route with JSON; do not depend on RSC HTML.
 * **Auth:** `createRouteHandlerClient` — cookies (web) or `Authorization: Bearer` (native); 401 if missing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { validateChatMediaIdsForSend } from '@/lib/onlyfans-chat-media'
import { createOnlyFansAPI, isOnlyFansRateLimitError } from '@/lib/onlyfans-api'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'
import { logMessageSendEvent } from '@/lib/usage/log-message-send'
import { bumpSubscriptionMessagesSent } from '@/lib/usage/bump-messages-sent'
import { createAriadneTraceExport } from '@/lib/ariadne/create-ariadne-trace-export'
import { toLegacyAudienceProfileType } from '@/lib/fans/profile-types'

interface MassMessageRequest {
  message: string
  platforms: string[]
  mediaIds?: (string | number)[]
  previews?: (string | number)[]
  price?: number
  filter?: 'all' | 'active' | 'expired' | 'renewing'
  /** OnlyFans user list ids (OnlyFansAPI mass messaging). */
  userLists?: string[]
  /** Optional explicit recipient fan ids for per-recipient trace and targeting. */
  userIds?: string[]
  trace?: {
    enabled?: boolean
    contentId?: string
    recipientKeyPrefix?: string
  }
}

// POST: Send mass message to all subscribers across platforms
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: MassMessageRequest = await request.json()
    const { message, platforms, mediaIds, previews, price, filter = 'all', userLists, userIds, trace } = body

    const trimmed = message?.trim()
    const hasText = typeof trimmed === 'string' && trimmed.length > 0
    const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0

    if (!hasText && !hasMedia) {
      return NextResponse.json({ 
        error: 'Message text or media and at least one platform are required' 
      }, { status: 400 })
    }

    if (
      Array.isArray(platforms) &&
      (platforms.includes('onlyfans') || platforms.includes('fansly'))
    ) {
      const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
      if (billingBlock) return billingBlock
    }

    // Get platform connections
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .in('platform', platforms)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        error: 'No connected platforms found. Please connect your accounts first.' 
      }, { status: 400 })
    }

    const results: Record<string, { 
      success: boolean
      sent?: number
      failed?: number
      error?: string 
    }> = {}

    let totalSent = 0
    let totalFailed = 0
    let onlyFansRateLimited = false
    let traceGenerated = 0
    let traceFailed = 0
    const traceErrors: string[] = []

    // Send to each platform
    for (const platform of platforms) {
      const connection = connections.find(c => c.platform === platform)
      
      if (!connection) {
        results[platform] = { success: false, error: 'Platform not connected' }
        continue
      }

      try {
        if (platform === 'fansly') {
          const api = createFanslyAPI()
          const accountId = connection.platform_user_id

          const result = await api.sendMassMessage(accountId, {
            content: trimmed || '',
            mediaIds: mediaIds?.map((id) => String(id)),
            price,
            subscriberFilter: filter,
          })

          results.fansly = {
            success: result.success,
            sent: result.sent,
            failed: result.failed,
            error: result.success ? undefined : result.message
          }

          totalSent += result.sent || 0
          totalFailed += result.failed || 0

        } else if (platform === 'onlyfans') {
          const ofMediaErr = validateChatMediaIdsForSend(mediaIds)
          if (ofMediaErr) {
            results.onlyfans = { success: false, sent: 0, failed: 0, error: ofMediaErr }
            continue
          }

          // OnlyFans rule: all paid messages must contain at least one media file
          if (typeof price === 'number' && price > 0 && !hasMedia) {
            results.onlyfans = {
              success: false,
              sent: 0,
              failed: 0,
              error: 'Paid messages must include at least one media file.',
            }
            continue
          }

          // previews must be subset of mediaIds if provided
          if (Array.isArray(previews) && previews.length > 0 && hasMedia) {
            const mediaSet = new Set(mediaIds.map((m) => String(m)))
            const invalid = previews.find((p) => !mediaSet.has(String(p)))
            if (invalid !== undefined) {
              results.onlyfans = {
                success: false,
                sent: 0,
                failed: 0,
                error: 'Preview media must also be included in media files.',
              }
              continue
            }
          }
          const api = createOnlyFansAPI(connection.access_token)

          const result = await api.sendMassMessage({
            text: trimmed || '',
            mediaFiles: mediaIds,
            previews,
            price,
            userLists:
              Array.isArray(userLists) && userLists.length > 0
                ? userLists.filter((id) => typeof id === 'string' && id.length > 0)
                : undefined,
            userIds:
              Array.isArray(userIds) && userIds.length > 0
                ? userIds.filter((id) => typeof id === 'string' && id.length > 0)
                : undefined,
          })

          results.onlyfans = {
            success: result.sent > 0,
            sent: result.sent,
            failed: result.failed,
            error: result.sent === 0 ? 'Failed to send messages' : undefined
          }

          totalSent += result.sent || 0
          totalFailed += result.failed || 0

          const traceEnabled = Boolean(trace?.enabled)
          const traceContentId = typeof trace?.contentId === 'string' ? trace.contentId.trim() : ''
          const targetUserIds =
            Array.isArray(userIds) && userIds.length > 0
              ? userIds.filter((id) => typeof id === 'string' && id.length > 0)
              : []

          if (typeof price === 'number' && price > 0 && targetUserIds.length > 0) {
            let updateRes = await supabase
              .from('fans')
              .update({
                audience_profile_override: 'paying_creator',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)
              .eq('platform', 'onlyfans')
              .in('platform_fan_id', targetUserIds)
              .is('audience_profile_override', null)

            if (updateRes.error && /fans_audience_profile_override_check/i.test(updateRes.error.message ?? '')) {
              updateRes = await supabase
                .from('fans')
                .update({
                  audience_profile_override: toLegacyAudienceProfileType('paying_creator'),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .eq('platform', 'onlyfans')
                .in('platform_fan_id', targetUserIds)
                .is('audience_profile_override', null)
            }
          }

          if (traceEnabled) {
            if (!traceContentId) {
              results.onlyfans = {
                success: false,
                sent: result.sent,
                failed: result.failed,
                error: 'Ariadne trace enabled, but no trace contentId was provided.',
              }
            } else if (targetUserIds.length === 0) {
              results.onlyfans = {
                success: false,
                sent: result.sent,
                failed: result.failed,
                error: 'Ariadne trace per recipient requires explicit recipient IDs (userIds).',
              }
            } else {
              for (const recipientFanId of targetUserIds) {
                const recipientKeyPrefix =
                  typeof trace?.recipientKeyPrefix === 'string' && trace.recipientKeyPrefix.trim()
                    ? trace.recipientKeyPrefix.trim()
                    : 'mass'
                const traceOut = await createAriadneTraceExport({
                  supabase,
                  userId: user.id,
                  contentId: traceContentId,
                  recipientKey: `${recipientKeyPrefix}:${recipientFanId}`,
                  source: 'mass_dm',
                  recipient: {
                    platform: 'onlyfans',
                    platformFanId: recipientFanId,
                  },
                  origin: {
                    massBatchId: result.id != null ? String(result.id) : undefined,
                  },
                  updateContentRow: false,
                })
                if (traceOut.ok) {
                  traceGenerated += 1
                } else {
                  traceFailed += 1
                  traceErrors.push(`${recipientFanId}: ${traceOut.error}`)
                }
              }
            }
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        const rateLimited = isOnlyFansRateLimitError(msg)
        results[platform] = {
          success: false,
          error: rateLimited
            ? 'OnlyFans is temporarily limiting requests. Please retry shortly.'
            : error instanceof Error
              ? error.message
              : 'Failed to send'
        }
        if (rateLimited) {
          onlyFansRateLimited = true
          results[platform].error += ' [ONLYFANS_RATE_LIMIT]'
        }
      }
    }

    const allSuccessful = Object.values(results).every(r => r.success)

    if (totalSent > 0) {
      logMessageSendEvent({
        userId: user.id,
        platform: 'multi',
        source: 'mass_dm',
        metadata: { totalSent, totalFailed, platforms: [...platforms], traceGenerated, traceFailed },
      })
      bumpSubscriptionMessagesSent(user.id, totalSent)
    }

    const payload = {
      success: allSuccessful,
      totalSent,
      totalFailed,
      message: allSuccessful 
        ? `Successfully sent to ${totalSent} subscribers`
        : `Sent to ${totalSent} subscribers, ${totalFailed} failed`,
      results,
      trace: {
        enabled: Boolean(trace?.enabled),
        generated: traceGenerated,
        failed: traceFailed,
        errors: traceErrors.slice(0, 20),
      },
    }
    if (totalSent === 0 && onlyFansRateLimited) {
      return NextResponse.json(
        { ...payload, code: 'ONLYFANS_RATE_LIMIT' },
        { status: 429 },
      )
    }

    return NextResponse.json(payload)

  } catch (error) {
    console.error('Mass message error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send mass message' },
      { status: 500 }
    )
  }
}
