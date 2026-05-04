import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

/** GET — Ranked top supporters (gross/net in partner minor units). Optional `before` / `after` unix ms. */
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
    const beforeRaw = searchParams.get('before')
    const afterRaw = searchParams.get('after')
    const before =
      beforeRaw != null && beforeRaw !== '' && Number.isFinite(Number(beforeRaw))
        ? Number(beforeRaw)
        : undefined
    const after =
      afterRaw != null && afterRaw !== '' && Number.isFinite(Number(afterRaw)) ? Number(afterRaw) : undefined

    const api = createFanslyAPI(String(accountId))
    const supporters = await api.getTopSupporters(String(accountId), { before, after })

    return NextResponse.json({ supporters, source: 'fansly' as const })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load top supporters'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
