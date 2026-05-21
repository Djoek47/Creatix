import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

const MAX_ROWS = 120

/**
 * GET — Follower graph (IDs + aggregated account rows). Response is capped for payload size.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createRouteHandlerClient(req)
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

    const api = createFanslyAPI(String(accountId))
    const { followers, accounts } = await api.listFollowersFull(String(accountId))

    return NextResponse.json({
      followerCount: followers.length,
      accountCount: accounts.length,
      followers: followers.slice(0, MAX_ROWS),
      accounts: accounts.slice(0, MAX_ROWS),
      truncated: followers.length > MAX_ROWS || accounts.length > MAX_ROWS,
      source: 'fansly' as const,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load followers'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
