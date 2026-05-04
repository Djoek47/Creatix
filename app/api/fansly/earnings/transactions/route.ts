import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

const EARNINGS_TX_CACHE_TTL_MS = 90_000
const EARNINGS_TX_MAX_CACHE = 200

type EarningsTxCacheRow = { expiresAt: number; payload: Record<string, unknown> }
const earningsTxCache = new Map<string, EarningsTxCacheRow>()

function pruneEarningsTxCache() {
  const now = Date.now()
  for (const [k, v] of earningsTxCache.entries()) {
    if (v.expiresAt <= now) earningsTxCache.delete(k)
  }
  if (earningsTxCache.size <= EARNINGS_TX_MAX_CACHE) return
  const sorted = [...earningsTxCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
  const drop = earningsTxCache.size - EARNINGS_TX_MAX_CACHE
  for (let i = 0; i < drop; i += 1) earningsTxCache.delete(sorted[i][0])
}

/**
 * GET — Paginated earnings transactions (ApiFansly ledger).
 * Query: `limit` (1–50), `offset`, optional `before` / `after` (unix ms),
 * optional `recentDays` (1–90, server clock) — sets `after`/`before` when neither is passed (avoids client skew).
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
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const beforeRaw = searchParams.get('before')
    const afterRaw = searchParams.get('after')
    let before =
      beforeRaw != null && beforeRaw !== '' && Number.isFinite(Number(beforeRaw))
        ? Number(beforeRaw)
        : undefined
    let after =
      afterRaw != null && afterRaw !== '' && Number.isFinite(Number(afterRaw)) ? Number(afterRaw) : undefined

    const recentDays = Math.min(
      90,
      Math.max(0, parseInt(searchParams.get('recentDays') || '0', 10)),
    )
    const now = Date.now()
    if (recentDays > 0 && before == null && after == null) {
      after = now - recentDays * 24 * 60 * 60 * 1000
      before = now
    }
    // ApiFansly rejects future `before`/`after` with 400 (client clock skew or bookmarked URLs).
    if (before != null && before > now) before = now
    if (after != null && after > now) after = now

    const cacheKey = `${user.id}::${String(accountId)}::${limit}::${offset}::${before ?? ''}::${after ?? ''}::${recentDays}`
    pruneEarningsTxCache()
    const hit = earningsTxCache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now()) {
      return NextResponse.json({ ...hit.payload, cached: true })
    }

    const api = createFanslyAPI(String(accountId))
    const { total, transactions } = await api.listEarningsTransactions(String(accountId), {
      limit,
      offset,
      before,
      after,
    })

    const body = { total, transactions, source: 'fansly' as const, cached: false }
    earningsTxCache.set(cacheKey, { expiresAt: Date.now() + EARNINGS_TX_CACHE_TTL_MS, payload: body })
    return NextResponse.json(body)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load transactions'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
