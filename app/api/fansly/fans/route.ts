/**
 * GET /api/fansly/fans
 * List subscribers from Fansly API (live). Query: filter=active|expired|latest|top|all, limit, offset.
 * Latest/top map to active (Fansly list API has no separate sorts yet).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { subscriptionTierFromTotalSpent } from '@/lib/fans/audience-classification'
import { subscriptionAccountTypeFromPrice } from '@/lib/fans/subscription-account-type'
import { subscriptionFieldsFromFanslyFan } from '@/lib/fans/subscription-dates'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

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

    const api = createFanslyAPI(accountId)
    api.setAccountId(accountId)

    const { searchParams } = new URL(request.url)
    const filterRaw = searchParams.get('filter') || 'active'
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    type Status = 'active' | 'expired' | 'all'
    let status: Status = 'active'
    if (filterRaw === 'expired') status = 'expired'
    else if (filterRaw === 'all') status = 'all'
    else if (filterRaw === 'latest' || filterRaw === 'top' || filterRaw === 'active') status = 'active'

    const { data: rawFans, count } = await api.getFans(accountId, {
      status,
      limit,
      offset,
    })

    const fans = rawFans.map((row) => {
      const spent = Number(row.totalSpent) || 0
      const subTier = subscriptionTierFromTotalSpent(spent)
      const tier = (subTier === 'vip' ? 'whale' : subTier) as 'whale' | 'regular' | 'new' | 'inactive'
      const sub = subscriptionFieldsFromFanslyFan({ expiresAt: row.expiresAt })
      return {
        id: String(row.id ?? ''),
        platform_fan_id: String(row.id ?? ''),
        user_id: String(row.id ?? ''),
        platform: 'fansly' as const,
        platform_username: String(row.username ?? ''),
        display_name: row.displayName ? String(row.displayName) : null,
        avatar_url: row.avatar ? String(row.avatar) : null,
        tier,
        total_spent: spent,
        subscription_price: null as number | null,
        subscription_account_type: subscriptionAccountTypeFromPrice(null),
        subscription_status: sub.subscription_status,
        subscription_start: row.subscribedAt ? String(row.subscribedAt) : null,
        subscription_expires_at: sub.subscription_expires_at,
        subscription_renews_on: null as string | null,
        last_interaction: null,
        notes: null,
        tags: [] as string[],
        is_favorite: false,
        is_blocked: false,
        created_at: String(row.subscribedAt ?? new Date().toISOString()),
        updated_at: String(row.expiresAt ?? row.subscribedAt ?? new Date().toISOString()),
      }
    })

    return NextResponse.json({ fans, total: fans.length, apiTotal: count ?? fans.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Fansly fans'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
