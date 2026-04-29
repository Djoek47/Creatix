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
import { readPartnerTotalSpend } from '@/lib/crm/partner-fan-spend'
import { subscriptionFieldsFromOnlyFansFan } from '@/lib/fans/subscription-dates'
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
      const spent = readPartnerTotalSpend(row)
      const subTier = subscriptionTierFromTotalSpent(spent)
      const tier = (subTier === 'vip' ? 'whale' : subTier) as 'whale' | 'regular' | 'new' | 'inactive'
      const expiresRaw =
        row.expiresAt != null && String(row.expiresAt).trim()
          ? String(row.expiresAt)
          : row.expires_at != null && String(row.expires_at).trim()
            ? String(row.expires_at)
            : null
      const renewsOn =
        row.renewsOn != null && String(row.renewsOn).trim()
          ? String(row.renewsOn)
          : row.renews_on != null && String(row.renews_on).trim()
            ? String(row.renews_on)
            : null
      const subPriceRaw = row.subscriptionPrice ?? row.subscription_price
      const subscription_price =
        subPriceRaw != null && subPriceRaw !== '' && Number.isFinite(Number(subPriceRaw))
          ? Number(subPriceRaw)
          : null
      const subscribedAtRaw =
        row.subscribedAt != null && String(row.subscribedAt).trim()
          ? String(row.subscribedAt)
          : row.subscribed_at != null && String(row.subscribed_at).trim()
            ? String(row.subscribed_at)
            : null
      const ofSub = subscriptionFieldsFromOnlyFansFan({
        expiresAt: expiresRaw ?? undefined,
        renewsOn: renewsOn,
        isRenewOn:
          typeof row.isRenewOn === 'boolean'
            ? row.isRenewOn
            : typeof row.is_renew_on === 'boolean'
              ? row.is_renew_on
              : undefined,
      })
      const statusFromApi = row.subscriptionStatus ?? row.subscription_status
      const subscription_status =
        typeof statusFromApi === 'string' && statusFromApi.trim()
          ? String(statusFromApi).trim()
          : filter === 'expired'
            ? 'expired'
            : ofSub.subscription_status
      return {
      id: String(row.id ?? ''),
      platform_fan_id: String(row.id ?? ''),
      user_id: String(row.id ?? ''),
      platform: 'onlyfans' as const,
      platform_username: String(row.username ?? row.userName ?? row.user_name ?? ''),
      display_name: row.name ? String(row.name) : row.displayName != null ? String(row.displayName) : null,
      avatar_url:
        row.avatar != null
          ? String(row.avatar)
          : row.avatarUrl != null
            ? String(row.avatarUrl)
            : null,
      tier,
      total_spent: spent,
      subscription_price,
      subscription_account_type: subscriptionAccountTypeFromPrice(subscription_price),
      subscription_status,
      subscription_start: subscribedAtRaw,
      subscription_expires_at: ofSub.subscription_expires_at,
      subscription_renews_on: ofSub.subscription_renews_on ?? renewsOn,
      last_interaction: null,
      notes: null,
      tags: Array.isArray(row.lists) ? (row.lists as string[]) : [],
      is_favorite: false,
      is_blocked: false,
      created_at: String(subscribedAtRaw ?? new Date().toISOString()),
      updated_at: String(ofSub.subscription_expires_at ?? subscribedAtRaw ?? new Date().toISOString()),
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
