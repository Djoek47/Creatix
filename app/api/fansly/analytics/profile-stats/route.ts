import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

const CACHE_TTL_MS = 120_000
const MAX_CACHE = 200

type CacheRow = { expiresAt: number; payload: unknown }
const profileStatsCache = new Map<string, CacheRow>()

function pruneFanslyProfileStatsCache() {
  const now = Date.now()
  for (const [k, v] of profileStatsCache.entries()) {
    if (v.expiresAt <= now) profileStatsCache.delete(k)
  }
  if (profileStatsCache.size <= MAX_CACHE) return
  const sorted = [...profileStatsCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
  const drop = profileStatsCache.size - MAX_CACHE
  for (let i = 0; i < drop; i += 1) profileStatsCache.delete(sorted[i][0])
}

/**
 * GET — Profile analytics (views, visits, engagement, top media).
 * Optional: `recentDays` (1–90, default 30) maps to `beforeDate`/`afterDate` (server clock).
 * Optional: `period` (ms bucket, e.g. 86400000 for daily), `year`, `month`.
 *
 * Short-lived server cache reduces 429s from repeated dashboard loads.
 * @see https://docs.apifansly.com/api-reference/profile-stats
 */
export async function GET(request: NextRequest) {
  try {
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

    const accountId = connection?.access_token ?? connection?.platform_user_id
    if (!accountId) {
      return NextResponse.json({ error: 'Fansly is not connected' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const DAY_MS = 24 * 60 * 60 * 1000
    const now = Date.now()

    const beforeRaw = searchParams.get('beforeDate')
    const afterRaw = searchParams.get('afterDate')
    let beforeDate =
      beforeRaw != null && beforeRaw !== '' && Number.isFinite(Number(beforeRaw)) ? Number(beforeRaw) : undefined
    let afterDate =
      afterRaw != null && afterRaw !== '' && Number.isFinite(Number(afterRaw)) ? Number(afterRaw) : undefined

    const recentDays = Math.min(90, Math.max(0, parseInt(searchParams.get('recentDays') || '30', 10)))
    if (recentDays > 0 && beforeDate == null && afterDate == null) {
      afterDate = now - recentDays * DAY_MS
      beforeDate = now
    }
    if (beforeDate != null && beforeDate > now) beforeDate = now
    if (afterDate != null && afterDate > now) afterDate = now

    const periodRaw = searchParams.get('period')
    const period =
      periodRaw != null && periodRaw !== '' && Number.isFinite(Number(periodRaw))
        ? Number(periodRaw)
        : 86400000

    const year = Math.max(0, parseInt(searchParams.get('year') || '0', 10))
    const month = Math.min(12, Math.max(0, parseInt(searchParams.get('month') || '0', 10)))

    const cacheKey = `${user.id}::${String(accountId)}::${beforeDate ?? ''}::${afterDate ?? ''}::${period}::${year}::${month}`
    pruneFanslyProfileStatsCache()
    const hit = profileStatsCache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now()) {
      return NextResponse.json({ ...(hit.payload as Record<string, unknown>), cached: true })
    }

    const api = createFanslyAPI(String(accountId))
    const payload = await api.getProfileStats(String(accountId), {
      beforeDate,
      afterDate,
      period,
      year: year > 0 ? year : undefined,
      month: month > 0 ? month : undefined,
    })

    const body = { data: payload, source: 'fansly' as const, cached: false }
    profileStatsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload: body })
    return NextResponse.json(body)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load profile stats'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
