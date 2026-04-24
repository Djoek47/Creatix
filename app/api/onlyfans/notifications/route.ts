import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  createOnlyFansAPI,
  isOnlyFansRateLimitError,
  isOnlyFansUpstreamTransientError,
} from '@/lib/onlyfans-api'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

type PartnerErrKind = 'session' | 'rate' | 'upstream' | 'other'

function classifyOnlyFansPartnerError(message: string): PartnerErrKind {
  if (message.includes('ONLYFANS_SESSION_EXPIRED')) return 'session'
  if (isOnlyFansRateLimitError(message)) return 'rate'
  if (isOnlyFansUpstreamTransientError(message)) return 'upstream'
  return 'other'
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'OnlyFans is not connected' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const tab = searchParams.get('tab') || undefined

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    // Counts and list are separate upstream calls; one can 403 while the other succeeds.
    let counts: Awaited<ReturnType<typeof api.getNotificationCounts>> | null = null
    let countsKind: PartnerErrKind | null = null
    try {
      counts = await api.getNotificationCounts()
    } catch (e) {
      countsKind = classifyOnlyFansPartnerError(e instanceof Error ? e.message : '')
    }

    let notifications: Awaited<ReturnType<typeof api.listNotifications>>['notifications'] = []
    let listKind: PartnerErrKind | null = null
    try {
      const list = await api.listNotifications({ limit, offset, tab })
      notifications = list.notifications
    } catch (e) {
      listKind = classifyOnlyFansPartnerError(e instanceof Error ? e.message : '')
    }

    if (countsKind === 'session' || listKind === 'session') {
      return NextResponse.json(
        { error: 'OnlyFans session expired; please reconnect your account.', code: 'ONLYFANS_SESSION_EXPIRED' },
        { status: 401 },
      )
    }

    const countsFailed = counts === null
    const listFailed = listKind !== null

    if (countsFailed && listFailed) {
      const kinds = [countsKind, listKind].filter((k): k is PartnerErrKind => k != null)
      if (kinds.includes('rate')) {
        return NextResponse.json(
          {
            error: 'OnlyFans is temporarily limiting requests. Wait 30–60 seconds and try again.',
            code: 'ONLYFANS_RATE_LIMIT',
          },
          { status: 429 },
        )
      }
      if (kinds.includes('upstream')) {
        return NextResponse.json(
          {
            error:
              'OnlyFans had a temporary glitch loading notifications. Wait a minute and try again, or reconnect in Settings if this persists.',
            code: 'ONLYFANS_UPSTREAM',
          },
          { status: 503 },
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch OnlyFans notifications', code: 'ONLYFANS_FETCH_FAILED' },
        { status: 500 },
      )
    }

    const stale = countsFailed || listFailed
    const code =
      countsKind === 'upstream' || listKind === 'upstream'
        ? 'ONLYFANS_UPSTREAM'
        : countsKind === 'rate' || listKind === 'rate'
          ? 'ONLYFANS_RATE_LIMIT'
          : undefined

    return NextResponse.json({
      counts: counts ?? { total: 0, unread: 0 },
      notifications,
      ...(stale ? { stale: true as const } : {}),
      ...(code ? { code } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications'
    if (message.includes('ONLYFANS_SESSION_EXPIRED')) {
      return NextResponse.json(
        { error: 'OnlyFans session expired; please reconnect your account.', code: 'ONLYFANS_SESSION_EXPIRED' },
        { status: 401 },
      )
    }
    if (isOnlyFansRateLimitError(message)) {
      return NextResponse.json(
        {
          error: 'OnlyFans is temporarily limiting requests. Wait 30–60 seconds and try again.',
          code: 'ONLYFANS_RATE_LIMIT',
        },
        { status: 429 },
      )
    }
    if (isOnlyFansUpstreamTransientError(message)) {
      return NextResponse.json(
        {
          error:
            'OnlyFans had a temporary glitch loading notifications. Wait a minute and try again.',
          code: 'ONLYFANS_UPSTREAM',
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

