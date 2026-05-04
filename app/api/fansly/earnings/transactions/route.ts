import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

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

    const api = createFanslyAPI(String(accountId))
    const { total, transactions } = await api.listEarningsTransactions(String(accountId), {
      limit,
      offset,
      before,
      after,
    })

    return NextResponse.json({ total, transactions, source: 'fansly' as const })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load transactions'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
