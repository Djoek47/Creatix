/**
 * GET /api/onlyfans/fans
 * List fans from OnlyFans API (live data). Query: filter=active|expired|latest|top|all, limit (1–200), offset, sort (for top).
 * Upstream allows at most 20 fans per HTTP call; this route pages automatically for larger limits.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { subscriptionTierFromTotalSpent } from '@/lib/fans/audience-classification'
import { subscriptionAccountTypeFromPrice } from '@/lib/fans/subscription-account-type'
import { extractOnlyFansFanRows } from '@/lib/onlyfans/fan-list-extract'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

/** Partner OnlyFans API caps `limit` at 20 per call; larger totals use multiple pages. */
const OF_FAN_LIST_PAGE_MAX = 20
const FAN_LIST_MAX = 200

/**
 * Fetch fan list pages until `totalLimit` rows are collected or the API returns a short page.
 */
async function fetchFanListPaged(
  totalLimit: number,
  startOffset: number,
  fetchPage: (limit: number, offset: number) => Promise<unknown>,
): Promise<unknown> {
  const merged: unknown[] = []
  let offset = startOffset
  while (merged.length < totalLimit) {
    const need = totalLimit - merged.length
    const pageLimit = Math.min(OF_FAN_LIST_PAGE_MAX, need)
    const page = await fetchPage(pageLimit, offset)
    const rows = extractOnlyFansFanRows(page)
    merged.push(...rows)
    if (rows.length < pageLimit) break
    if (rows.length === 0) break
    offset += rows.length
  }
  return { data: merged }
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

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const { searchParams } = new URL(request.url)
    const filter = (searchParams.get('filter') || 'active') as 'active' | 'expired' | 'latest' | 'top' | 'all'
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '25', 10) || 25, 1),
      FAN_LIST_MAX,
    )
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)
    const sort = (searchParams.get('sort') || 'total') as
      | 'total'
      | 'subscriptions'
      | 'tips'
      | 'messages'
      | 'posts'
      | 'streams'

    let data: unknown
    switch (filter) {
      case 'all':
        data = await fetchFanListPaged(limit, offset, (l, o) => api.getFansAll({ limit: l, offset: o }))
        break
      case 'expired':
        data = await fetchFanListPaged(limit, offset, (l, o) => api.getFansExpired({ limit: l, offset: o }))
        break
      case 'latest':
        data = await fetchFanListPaged(limit, offset, (l, o) => api.getFansLatest({ limit: l, offset: o }))
        break
      case 'top':
        data = await fetchFanListPaged(limit, offset, (l, o) => api.getFansTop({ limit: l, offset: o, sort }))
        break
      default:
        data = await fetchFanListPaged(limit, offset, (l, o) => api.getFansActive({ limit: l, offset: o }))
    }

    const raw = extractOnlyFansFanRows(data) as Record<string, unknown>[]
    const fans = raw.map((row) => {
      const spent = Number(row.totalSpent) || 0
      const subTier = subscriptionTierFromTotalSpent(spent)
      const tier = (subTier === 'vip' ? 'whale' : subTier) as 'whale' | 'regular' | 'new' | 'inactive'
      const expiresAt = row.expiresAt != null && String(row.expiresAt).trim() ? String(row.expiresAt) : null
      const renewsOn = row.renewsOn != null && String(row.renewsOn).trim() ? String(row.renewsOn) : null
      const subPriceRaw = row.subscriptionPrice
      const subscription_price =
        subPriceRaw != null && subPriceRaw !== '' && Number.isFinite(Number(subPriceRaw))
          ? Number(subPriceRaw)
          : null
      return {
      id: String(row.id ?? ''),
      platform_fan_id: String(row.id ?? ''),
      user_id: String(row.id ?? ''),
      platform: 'onlyfans' as const,
      platform_username: String(row.username ?? ''),
      display_name: row.name ? String(row.name) : null,
      avatar_url: row.avatar ? String(row.avatar) : null,
      tier,
      total_spent: spent,
      subscription_price,
      subscription_account_type: subscriptionAccountTypeFromPrice(subscription_price),
      subscription_start: row.subscribedAt ? String(row.subscribedAt) : null,
      subscription_expires_at: expiresAt,
      subscription_renews_on: renewsOn,
      last_interaction: null,
      notes: null,
      tags: Array.isArray(row.lists) ? (row.lists as string[]) : [],
      is_favorite: false,
      is_blocked: false,
      created_at: String(row.subscribedAt ?? new Date().toISOString()),
      updated_at: String(row.expiresAt ?? row.subscribedAt ?? new Date().toISOString()),
    }
    })
    return NextResponse.json({ fans, total: fans.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch fans'
    if (String(message).includes('ONLYFANS_SESSION_EXPIRED')) {
      return NextResponse.json({ error: 'OnlyFans session expired; please reconnect.' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
