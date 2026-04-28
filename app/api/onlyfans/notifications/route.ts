import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  createOnlyFansAPI,
  isOnlyFansRateLimitError,
  isOnlyFansUpstreamTransientError,
} from '@/lib/onlyfans-api'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

type PartnerErrKind = 'session' | 'rate' | 'upstream' | 'other'
type NotificationsPayload = {
  counts: { total?: number; unread?: number }
  notifications: Awaited<ReturnType<ReturnType<typeof createOnlyFansAPI>['listNotifications']>>['notifications']
  stale?: true
  code?: 'ONLYFANS_UPSTREAM' | 'ONLYFANS_RATE_LIMIT'
}

const NOTIFICATION_MIN_REFRESH_MS = 60_000
const RATE_LIMIT_BACKOFF_MS = 90_000
const NOTIFICATION_CACHE_TTL_MS = 5 * 60_000

const notificationsCache = new Map<
  string,
  { payload: NotificationsPayload; fetchedAt: number; rateLimitedUntil?: number }
>()

/** Concurrent GETs with the same cacheKey await one upstream counts+list burst (matches inbox chats pattern). */
const notificationsInflight = new Map<string, Promise<NextResponse>>()

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
    const cacheKey = `${user.id}:${limit}:${offset}:${tab ?? 'all'}`
    const now = Date.now()
    const cached = notificationsCache.get(cacheKey)
    if (cached) {
      if (now - cached.fetchedAt > NOTIFICATION_CACHE_TTL_MS) {
        notificationsCache.delete(cacheKey)
      } else if (cached.rateLimitedUntil && cached.rateLimitedUntil > now) {
        return NextResponse.json(
          {
            ...cached.payload,
            stale: true as const,
            code: 'ONLYFANS_RATE_LIMIT' as const,
            error: 'OnlyFans is temporarily limiting requests. Reusing recent notifications.',
            retry_after_ms: cached.rateLimitedUntil - now,
          },
          { status: 200 },
        )
      } else if (now - cached.fetchedAt < NOTIFICATION_MIN_REFRESH_MS) {
        return NextResponse.json({ ...cached.payload, stale: true as const })
      }
    }

    /** Snapshot for rate-limit stale responses (still valid after TTL delete clears the map entry). */
    const cachedSnapshot = cached

    const runUpstream = async (): Promise<NextResponse> => {
      const fetchedAt = Date.now()
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
          if (cachedSnapshot) {
            notificationsCache.set(cacheKey, {
              ...cachedSnapshot,
              rateLimitedUntil: fetchedAt + RATE_LIMIT_BACKOFF_MS,
            })
            return NextResponse.json(
              {
                ...cachedSnapshot.payload,
                stale: true as const,
                code: 'ONLYFANS_RATE_LIMIT' as const,
                error: 'OnlyFans is temporarily limiting requests. Reusing recent notifications.',
                retry_after_ms: RATE_LIMIT_BACKOFF_MS,
              },
              { status: 200 },
            )
          }
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
      const payload: NotificationsPayload = {
        counts: counts ?? { total: 0, unread: 0 },
        notifications,
        ...(stale ? { stale: true as const } : {}),
        ...(code ? { code } : {}),
      }
      notificationsCache.set(cacheKey, {
        payload,
        fetchedAt,
        ...(code === 'ONLYFANS_RATE_LIMIT' ? { rateLimitedUntil: fetchedAt + RATE_LIMIT_BACKOFF_MS } : {}),
      })
      return NextResponse.json(payload)
    }

    let inflight = notificationsInflight.get(cacheKey)
    if (!inflight) {
      inflight = runUpstream().finally(() => {
        notificationsInflight.delete(cacheKey)
      })
      notificationsInflight.set(cacheKey, inflight)
    }
    return await inflight
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

