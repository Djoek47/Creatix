import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { loadAdultPlatformBillingContext } from '@/lib/billing/onlyfans-billing-gate'
import { ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE } from '@/lib/onlyfans-api-route'
import { clearOnlyFansDmMessageCacheForUser } from '@/lib/messages/of-dm-cache'

function adultPlatformBillingPayload(
  billingCtx: Awaited<ReturnType<typeof loadAdultPlatformBillingContext>>,
  onlyfansConnected: boolean,
) {
  const denial = billingCtx?.denial ?? null
  const fanslyConnected = !!billingCtx?.fanslyAccessToken
  return {
    adultPlatformBillingDenial: denial,
    onlyFansAccessBlocked: onlyfansConnected && denial != null,
    fanslyAccessBlocked: fanslyConnected && denial != null,
    /** @deprecated use adultPlatformBillingDenial */
    onlyFansBillingBlock: denial,
  }
}

// GET: Report if the current user has an OnlyFans connection. Does NOT assign accounts
// from the OnlyFans API to the current user; new connections are only created in the callback.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    const [{ data: connection }, billingCtx] = await Promise.all([
      supabase
        .from('platform_connections')
        .select(
          'access_token, platform_username, observed_monthly_revenue_usd, observed_revenue_captured_at, observed_revenue_onlyfans_account_id',
        )
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .maybeSingle(),
      loadAdultPlatformBillingContext(supabase),
    ])

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      const billing = adultPlatformBillingPayload(billingCtx, !!connection?.access_token)
      return NextResponse.json({
        connected: !!connection,
        accountId: connection?.access_token ?? undefined,
        username: connection?.platform_username ?? undefined,
        ...billing,
      })
    }

    const api = createOnlyFansAPI()
    const accountsResult = await api.listAccounts()

    // If user has no connection in our DB, only report status — do not assign any API account
    if (!connection) {
      const billing = adultPlatformBillingPayload(billingCtx, false)
      return NextResponse.json({
        connected: false,
        accountId: undefined,
        username: undefined,
        ...billing,
      })
    }

    // User has a connection: verify it still exists and is fully connected on the API
    if (!accountsResult.success || !accountsResult.accounts || accountsResult.accounts.length === 0) {
      await supabase
        .from('platform_connections')
        .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      await clearOnlyFansDmMessageCacheForUser(supabase, user.id)
      const freshBilling = await loadAdultPlatformBillingContext(supabase)
      return NextResponse.json({
        connected: false,
        accountId: undefined,
        username: undefined,
        ...adultPlatformBillingPayload(freshBilling, false),
      })
    }

    const fullyConnectedAccounts = (accountsResult.accounts || []).filter(
      (acc: { onlyfans_username?: string; onlyfans_user_data?: unknown }) =>
        acc.onlyfans_username != null || (acc as any)?.onlyfans_user_data != null
    )

    const matchingAccount = fullyConnectedAccounts.find(
      (acc: { id?: string }) => acc.id === connection.access_token
    )

    if (!matchingAccount) {
      await supabase
        .from('platform_connections')
        .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      await clearOnlyFansDmMessageCacheForUser(supabase, user.id)
      const freshBilling = await loadAdultPlatformBillingContext(supabase)
      return NextResponse.json({
        connected: false,
        accountId: undefined,
        username: undefined,
        ...adultPlatformBillingPayload(freshBilling, false),
      })
    }

    const userData = (matchingAccount as any)?.onlyfans_user_data || {}
    const displayName =
      userData.name ?? (matchingAccount as any).onlyfans_username ?? connection.platform_username ?? 'Unknown'

    if (connection.platform_username !== displayName) {
      await supabase
        .from('platform_connections')
        .update({ platform_username: displayName })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
    }

    const billing = adultPlatformBillingPayload(billingCtx, true)

    return NextResponse.json({
      connected: true,
      accountId: connection.access_token,
      username: displayName,
      ...billing,
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Check failed',
    })
  }
}
