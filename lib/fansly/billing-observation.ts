import type { SupabaseClient } from '@supabase/supabase-js'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyMonthToDateRevenueUsd } from '@/lib/fansly/observed-month-to-date-revenue'

export async function writeFanslyConnectionBillingSnapshot(
  supabase: SupabaseClient,
  args: {
    connectionRowId: string
    accountId: string
    observedUsd: number | null
    platformUsername?: string | null
  },
): Promise<void> {
  const aid = String(args.accountId)
  await supabase
    .from('platform_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      ...(args.platformUsername != null && String(args.platformUsername).trim() !== ''
        ? { platform_username: String(args.platformUsername).trim() }
        : {}),
      ...(args.observedUsd != null
        ? {
            observed_monthly_revenue_usd: args.observedUsd,
            observed_revenue_captured_at: new Date().toISOString(),
            observed_revenue_onlyfans_account_id: aid,
          }
        : {}),
    })
    .eq('id', args.connectionRowId)
}

/** Fetches MTD revenue and writes scoped observation fields (for post-OAuth parity with full sync). */
export async function refreshFanslyObservedRevenueForBilling(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('id, access_token, platform_user_id, platform_username')
    .eq('user_id', userId)
    .eq('platform', 'fansly')
    .eq('is_connected', true)
    .maybeSingle()

  const accountId = connection?.access_token ?? connection?.platform_user_id
  if (!connection?.id || !accountId) return

  const api = createFanslyAPI(String(accountId))
  let observed: number | null = null
  try {
    observed = await fanslyMonthToDateRevenueUsd(api, String(accountId))
  } catch (e) {
    console.warn('[fansly] billing observation MTD fetch failed:', e)
    return
  }

  await writeFanslyConnectionBillingSnapshot(supabase, {
    connectionRowId: connection.id,
    accountId: String(accountId),
    observedUsd: observed,
    platformUsername: connection.platform_username,
  })
}
