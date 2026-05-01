import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  computeRequiredRevenueTierFromScopedObservations,
  combinedScopedMonthlyRevenueUsdForBilling,
  evaluateAdultPlatformBillingDenial,
  scopedObservationFromFanslyRow,
  scopedObservationFromOnlyFansRow,
  subscribedRevenueTierIndex,
  PLATFORM_CONNECTION_OBSERVED_SELECT,
} from '@/lib/billing/onlyfans-billing-gate'
import { isPaidSubscription, type SubscriptionLike } from '@/lib/billing/access'

const PLATFORM_SELECT = PLATFORM_CONNECTION_OBSERVED_SELECT
/**
 * Declared vs observation-derived revenue band for billing UI + dashboard banner.
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

    const [{ data: ofConn }, { data: fsConn }, { data: subscription }] = await Promise.all([
      supabase
        .from('platform_connections')
        .select(PLATFORM_SELECT)
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .maybeSingle(),
      supabase
        .from('platform_connections')
        .select(PLATFORM_SELECT)
        .eq('user_id', user.id)
        .eq('platform', 'fansly')
        .eq('is_connected', true)
        .maybeSingle(),
      supabase.from('subscriptions').select('plan_id,status,revenue_tier,revenue_tier_sync_paused_until').eq('user_id', user.id).maybeSingle(),
    ])

    const onlyfansObs = scopedObservationFromOnlyFansRow(ofConn)
    const fanslyObs = scopedObservationFromFanslyRow(fsConn)
    const requiredMinTier = computeRequiredRevenueTierFromScopedObservations({
      onlyfans: onlyfansObs,
      fansly: fanslyObs,
    })

    const sub = subscription as SubscriptionLike | null
    const declaredTier = subscribedRevenueTierIndex(sub)
    const paidActive = isPaidSubscription(sub)

    const denial = evaluateAdultPlatformBillingDenial({
      subscription: sub,
      onlyfans: onlyfansObs,
      fansly: fanslyObs,
    })

    const capturedTimes = [
      ofConn?.observed_revenue_captured_at != null ? String(ofConn.observed_revenue_captured_at) : '',
      fsConn?.observed_revenue_captured_at != null ? String(fsConn.observed_revenue_captured_at) : '',
    ].filter(Boolean)

    let observationCapturedAtMax: string | null = null
    if (capturedTimes.length > 0) {
      observationCapturedAtMax = capturedTimes.reduce((a, b) =>
        new Date(a).getTime() >= new Date(b).getTime() ? a : b,
      )
    }

    const revenueUsd = combinedScopedMonthlyRevenueUsdForBilling({
      onlyfans: onlyfansObs,
      fansly: fanslyObs,
    })

    const pauseUntilRaw = sub?.revenue_tier_sync_paused_until ?? null
    const syncPausedUntil =
      pauseUntilRaw != null && String(pauseUntilRaw).trim() !== '' ? String(pauseUntilRaw) : null
    const syncPausedActive =
      syncPausedUntil != null && !Number.isNaN(Date.parse(syncPausedUntil)) && Date.parse(syncPausedUntil) > Date.now()

    const bandViolation =
      denial?.code === 'REVENUE_TIER_MISMATCH' && !syncPausedActive

    return NextResponse.json({
      requiredMinTier,
      declaredTier,
      paidActive,
      hasObservation: requiredMinTier != null,
      observationCapturedAtMax,
      observedOnlyfansMonthlyUsd: revenueUsd.onlyfansUsd,
      observedFanslyMonthlyUsd: revenueUsd.fanslyUsd,
      observedCombinedMonthlyUsd: revenueUsd.combinedUsd,
      bandViolation,
      revenueTierSyncPausedUntil: syncPausedUntil,
      revenueTierSyncPausedActive: syncPausedActive,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
