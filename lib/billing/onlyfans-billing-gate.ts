import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPaidPlanId, isPaidSubscription, type SubscriptionLike } from '@/lib/billing/access'
import { tierIndexFromMonthlyRevenue } from '@/lib/pricing-matrix'

export type OnlyFansBillingDenialCode = 'SUBSCRIPTION_INACTIVE' | 'REVENUE_TIER_MISMATCH'

export type OnlyFansBillingDenial = {
  code: OnlyFansBillingDenialCode
  message: string
  subscribedTier?: number
  requiredTier?: number
  observedMonthlyUsd?: number
}

/** Scoped snapshot for one connected adult platform row (`platform_connections`). */
export type ScopedPlatformObservation = {
  partnerAccountId: string
  observedMonthlyRevenueUsd: number | null | undefined
  observedRevenueCapturedAt: string | null | undefined
  /** Partner account id the observation was captured for (column name is historical; used for OF and Fansly). */
  observationScopedPartnerAccountId: string | null | undefined
}

export function subscribedRevenueTierIndex(row: SubscriptionLike | null | undefined): number {
  const t = typeof row?.revenue_tier === 'number' ? row.revenue_tier : null
  if (t == null || !Number.isFinite(t) || t < 0 || t > 10) return 0
  return t
}

/**
 * Paid plan in bad standing: block OnlyFans product APIs (disconnect / billing / sync stay available).
 */
export function denialForInactivePaidSubscription(
  subscription: SubscriptionLike | null | undefined,
): OnlyFansBillingDenial | null {
  const planId = subscription?.plan_id
  if (!isPaidPlanId(planId)) return null
  const st = (subscription?.status || '').toLowerCase()
  if (st === 'active' || st === 'trialing') return null
  return {
    code: 'SUBSCRIPTION_INACTIVE',
    message:
      'Your subscription is not active. Update billing or disconnect connected platforms until your plan is current.',
  }
}

/**
 * Only use stored revenue if it was captured for the same partner account id as currently connected.
 */
export function observedScopedRevenueForBilling(args: {
  currentPartnerAccountId: string
  observedMonthlyRevenueUsd: number | null | undefined
  observedRevenueCapturedAt: string | null | undefined
  observationScopedPartnerAccountId: string | null | undefined
}): { usd: number | null; capturedAt: string | null } {
  const stored =
    args.observationScopedPartnerAccountId != null ? String(args.observationScopedPartnerAccountId).trim() : ''
  const current = String(args.currentPartnerAccountId).trim()
  if (!stored || !current || stored !== current) {
    return { usd: null, capturedAt: null }
  }
  return {
    usd: args.observedMonthlyRevenueUsd != null ? Number(args.observedMonthlyRevenueUsd) : null,
    capturedAt: args.observedRevenueCapturedAt != null ? String(args.observedRevenueCapturedAt) : null,
  }
}

function requiredTierFromScopedObservation(obs: ScopedPlatformObservation | null): number | null {
  if (!obs) return null
  const scoped = observedScopedRevenueForBilling({
    currentPartnerAccountId: obs.partnerAccountId,
    observedMonthlyRevenueUsd: obs.observedMonthlyRevenueUsd,
    observedRevenueCapturedAt: obs.observedRevenueCapturedAt,
    observationScopedPartnerAccountId: obs.observationScopedPartnerAccountId,
  })
  if (scoped.capturedAt == null || String(scoped.capturedAt).trim() === '') return null
  if (scoped.usd == null || !Number.isFinite(Number(scoped.usd))) return null
  return tierIndexFromMonthlyRevenue(Math.max(0, Number(scoped.usd)))
}

/** Max revenue band implied by connected OF/Fansly observations (null if neither has scoped revenue). */
export function computeRequiredRevenueTierFromScopedObservations(args: {
  onlyfans: ScopedPlatformObservation | null
  fansly: ScopedPlatformObservation | null
}): number | null {
  const ofT = requiredTierFromScopedObservation(args.onlyfans)
  const fsT = requiredTierFromScopedObservation(args.fansly)
  const tiers = [ofT, fsT].filter((t): t is number => t != null)
  if (tiers.length === 0) return null
  return Math.max(...tiers)
}

function latestScopedObservationCaptureMs(
  onlyfans: ScopedPlatformObservation | null,
  fansly: ScopedPlatformObservation | null,
): number | null {
  let maxMs: number | null = null
  for (const obs of [onlyfans, fansly]) {
    if (!obs) continue
    const scoped = observedScopedRevenueForBilling({
      currentPartnerAccountId: obs.partnerAccountId,
      observedMonthlyRevenueUsd: obs.observedMonthlyRevenueUsd,
      observedRevenueCapturedAt: obs.observedRevenueCapturedAt,
      observationScopedPartnerAccountId: obs.observationScopedPartnerAccountId,
    })
    if (scoped.capturedAt == null || String(scoped.capturedAt).trim() === '') continue
    const ms = Date.parse(scoped.capturedAt)
    if (Number.isNaN(ms)) continue
    maxMs = maxMs == null ? ms : Math.max(maxMs, ms)
  }
  return maxMs
}

/**
 * Subscribed revenue band must cover the highest implied tier across OnlyFans and Fansly (each scoped to its connected account id).
 */
export function denialForRevenueTierUndershootMulti(args: {
  subscription: SubscriptionLike | null | undefined
  onlyfans: ScopedPlatformObservation | null
  fansly: ScopedPlatformObservation | null
}): OnlyFansBillingDenial | null {
  if (!isPaidSubscription(args.subscription)) return null
  const ofT = requiredTierFromScopedObservation(args.onlyfans)
  const fsT = requiredTierFromScopedObservation(args.fansly)
  const tiers = [ofT, fsT].filter((t): t is number => t != null)
  if (tiers.length === 0) return null
  const requiredTier = Math.max(...tiers)
  const subscribedTier = subscribedRevenueTierIndex(args.subscription)
  if (subscribedTier >= requiredTier) return null

  const graceHours = Number(process.env.REVENUE_BAND_MISMATCH_GRACE_HOURS_AFTER_OBSERVATION ?? '0')
  if (graceHours > 0 && Number.isFinite(graceHours)) {
    const latestMs = latestScopedObservationCaptureMs(args.onlyfans, args.fansly)
    if (latestMs != null && (Date.now() - latestMs) / 3_600_000 < graceHours) {
      return null
    }
  }

  return {
    code: 'REVENUE_TIER_MISMATCH',
    message:
      'Your plan’s revenue band is below what your connected OnlyFans and/or Fansly account(s) are earning. Upgrade your subscription to the matching band, or disconnect those platforms.',
    subscribedTier,
    requiredTier,
  }
}

export function evaluateAdultPlatformBillingDenial(args: {
  subscription: SubscriptionLike | null | undefined
  onlyfans: ScopedPlatformObservation | null
  fansly: ScopedPlatformObservation | null
}): OnlyFansBillingDenial | null {
  return (
    denialForInactivePaidSubscription(args.subscription) ??
    denialForRevenueTierUndershootMulti({
      subscription: args.subscription,
      onlyfans: args.onlyfans,
      fansly: args.fansly,
    })
  )
}

/** Whether requested tier is allowed given scoped observation revenue (checkout / subscription upsert). */
export function isRevenueTierBelowObservation(args: {
  requestedTierIndex: number
  onlyfans: ScopedPlatformObservation | null
  fansly: ScopedPlatformObservation | null
}): boolean {
  const minTier = computeRequiredRevenueTierFromScopedObservations({
    onlyfans: args.onlyfans,
    fansly: args.fansly,
  })
  if (minTier == null) return false
  return args.requestedTierIndex < minTier
}
export type PlatformConnectionObservedRow = {
  access_token?: string | null
  platform_user_id?: string | null
  observed_monthly_revenue_usd?: number | null
  observed_revenue_captured_at?: string | null
  observed_revenue_onlyfans_account_id?: string | null
  /** When true, we may recover partner id from `observed_revenue_onlyfans_account_id` if token columns are empty. */
  is_connected?: boolean | null
} | null

/**
 * Partner API account id for OnlyFans (stored in `access_token` for new connections; mirrors Fansly fallback on `platform_user_id`).
 * If the row is still marked connected but token columns were cleared, use the last scoped revenue account id.
 */
export function onlyFansPartnerAccountIdFromRow(row: PlatformConnectionObservedRow): string | null {
  if (!row) return null
  const fromToken = row.access_token != null && String(row.access_token).trim() !== '' ? String(row.access_token).trim() : null
  if (fromToken) return fromToken
  const fromPlatformUser =
    row.platform_user_id != null && String(row.platform_user_id).trim() !== '' ? String(row.platform_user_id).trim() : null
  if (fromPlatformUser) return fromPlatformUser
  if (row.is_connected === true) {
    const obs = row.observed_revenue_onlyfans_account_id
    if (obs != null && String(obs).trim() !== '') return String(obs).trim()
  }
  return null
}

export function scopedObservationFromOnlyFansRow(row: PlatformConnectionObservedRow): ScopedPlatformObservation | null {
  const id = onlyFansPartnerAccountIdFromRow(row)
  if (!id) return null
  return {
    partnerAccountId: id,
    observedMonthlyRevenueUsd: row.observed_monthly_revenue_usd != null ? Number(row.observed_monthly_revenue_usd) : null,
    observedRevenueCapturedAt: row.observed_revenue_captured_at ?? null,
    observationScopedPartnerAccountId: row.observed_revenue_onlyfans_account_id ?? null,
  }
}

export function scopedObservationFromFanslyRow(row: PlatformConnectionObservedRow): ScopedPlatformObservation | null {
  const id = row?.access_token ?? row?.platform_user_id
  if (id == null || String(id).trim() === '') return null
  return {
    partnerAccountId: String(id),
    observedMonthlyRevenueUsd: row.observed_monthly_revenue_usd != null ? Number(row.observed_monthly_revenue_usd) : null,
    observedRevenueCapturedAt: row.observed_revenue_captured_at ?? null,
    observationScopedPartnerAccountId: row.observed_revenue_onlyfans_account_id ?? null,
  }
}

/** Columns needed to derive scoped revenue observations for checkout + billing gates. */
export const PLATFORM_CONNECTION_OBSERVED_SELECT =
  'access_token, platform_user_id, observed_monthly_revenue_usd, observed_revenue_captured_at, observed_revenue_onlyfans_account_id, is_connected'

export async function loadScopedPlatformObservationsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ onlyfans: ScopedPlatformObservation | null; fansly: ScopedPlatformObservation | null }> {
  const [{ data: ofConn }, { data: fsConn }] = await Promise.all([
    supabase
      .from('platform_connections')
      .select(PLATFORM_CONNECTION_OBSERVED_SELECT)
      .eq('user_id', userId)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle(),
    supabase
      .from('platform_connections')
      .select(PLATFORM_CONNECTION_OBSERVED_SELECT)
      .eq('user_id', userId)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle(),
  ])
  return {
    onlyfans: scopedObservationFromOnlyFansRow(ofConn),
    fansly: scopedObservationFromFanslyRow(fsConn),
  }
}

export type AdultPlatformBillingContext = {
  onlyfansAccessToken: string | null
  fanslyAccessToken: string | null
  denial: OnlyFansBillingDenial | null
}

export async function loadAdultPlatformBillingContext(
  supabase: SupabaseClient,
): Promise<AdultPlatformBillingContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: ofConn }, { data: fsConn }, { data: subscription }] = await Promise.all([
    supabase
      .from('platform_connections')
      .select(PLATFORM_CONNECTION_OBSERVED_SELECT)
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle(),
    supabase
      .from('platform_connections')
      .select(PLATFORM_CONNECTION_OBSERVED_SELECT)
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle(),
    supabase.from('subscriptions').select('plan_id,status,revenue_tier').eq('user_id', user.id).maybeSingle(),
  ])

  const onlyfansAccessToken = onlyFansPartnerAccountIdFromRow(ofConn)
  const fanslyAccessToken =
    fsConn?.access_token != null && String(fsConn.access_token).trim() !== ''
      ? String(fsConn.access_token)
      : fsConn?.platform_user_id != null && String(fsConn.platform_user_id).trim() !== ''
        ? String(fsConn.platform_user_id)
        : null

  const onlyfansObs = scopedObservationFromOnlyFansRow(ofConn)
  const fanslyObs = scopedObservationFromFanslyRow(fsConn)

  const denial = evaluateAdultPlatformBillingDenial({
    subscription,
    onlyfans: onlyfansObs,
    fansly: fanslyObs,
  })

  const sampleRate = Number(process.env.REVENUE_BAND_EVAL_LOG_SAMPLE_RATE ?? '0')
  if (sampleRate > 0 && Number.isFinite(sampleRate) && Math.random() < Math.min(1, Math.max(0, sampleRate))) {
    const requiredTier = computeRequiredRevenueTierFromScopedObservations({
      onlyfans: onlyfansObs,
      fansly: fanslyObs,
    })
    try {
      console.info(
        '[revenue_band_eval]',
        JSON.stringify({
          userId: user.id,
          declaredTier: subscribedRevenueTierIndex(subscription),
          requiredTier,
          hasObservation: requiredTier != null,
          denialCode: denial?.code ?? null,
        }),
      )
    } catch {
      // ignore logging failures
    }
  }

  return { onlyfansAccessToken, fanslyAccessToken, denial }
}

export function onlyFansBillingDenialToResponse(denial: OnlyFansBillingDenial): NextResponse {
  return NextResponse.json(
    {
      error: denial.message,
      code: 'ONLYFANS_BILLING_BLOCKED',
      reason: denial.code,
      ...(denial.code === 'REVENUE_TIER_MISMATCH'
        ? { billing_reason: 'revenue_tier_below_observed' as const }
        : {}),
      ...(denial.subscribedTier !== undefined ? { subscribedRevenueTier: denial.subscribedTier } : {}),
      ...(denial.requiredTier !== undefined ? { requiredRevenueTier: denial.requiredTier } : {}),
      ...(denial.observedMonthlyUsd !== undefined ? { observedMonthlyRevenueUsd: denial.observedMonthlyUsd } : {}),
    },
    { status: 403 },
  )
}
