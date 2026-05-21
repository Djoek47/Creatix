import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

/**
 * GET — Per-fan earnings rollups (monthly slices from ApiFansly).
 * `fanId` is the fan’s Fansly account id (`platform_fan_id` in CRM).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fanId: string }> }) {
  try {
    const { fanId: rawFanId } = await params
    const fanId = decodeURIComponent(rawFanId || '').trim()
    if (!fanId) {
      return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    }

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

    const api = createFanslyAPI(String(accountId))
    const months = await api.listFanEarningsRollups(String(accountId), fanId)

    return NextResponse.json({ months, fanId, source: 'fansly' as const })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load fan earnings'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
