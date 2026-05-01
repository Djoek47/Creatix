/**
 * Central paid / trial checks for subscriptions (revenue-tier model + legacy plan IDs).
 */

/** Canonical paid plan after revenue-tier migration */
export const PAID_PLAN_ID = 'cev-paid'

/** Flat $25/mo Protection & Anti-Piracy (separate Stripe subscription; can stack with cev-paid or standalone) */
export const PROTECTION_PLAN_ID = 'cev-protection'

/** When true, standalone Multiplatform Protection ($25/mo add-on) is not purchasable — show Coming soon in pricing + billing. */
export const MULTIPLATFORM_PROTECTION_COMING_SOON = true

/** Grandfathered Stripe / DB values that still grant full Pro access */
export const LEGACY_PAID_PLAN_IDS = ['venus-pro', 'circe-elite', 'divine-duo'] as const

export type LegacyPaidPlanId = (typeof LEGACY_PAID_PLAN_IDS)[number]

export function isPaidPlanId(planId: string | null | undefined): boolean {
  if (!planId) return false
  const p = planId.toLowerCase()
  if (p === PAID_PLAN_ID) return true
  return LEGACY_PAID_PLAN_IDS.some((x) => x === p)
}

export interface SubscriptionLike {
  plan_id?: string | null
  status?: string | null
  revenue_tier?: number | null
  /** When set in the future, Stripe tier alignment cron skips this subscriber (admin/support override). */
  revenue_tier_sync_paused_until?: string | null
}

/** Active paid subscription (including legacy SKUs and trial grandfathering handled elsewhere). */
export function isPaidSubscription(row: SubscriptionLike | null | undefined): boolean {
  if (!row?.plan_id) return false
  const st = (row.status || '').toLowerCase()
  if (st !== 'active' && st !== 'trialing') return false
  return isPaidPlanId(row.plan_id)
}

/** Trial / free tier plan id */
export const TRIAL_PLAN_ID = 'divine-trial'

/** Main product lapsed (trial ended / sub canceled / unpaid) — not Pro, not trial entitlement. */
export const FREE_PLAN_ID = 'cev-free'

export function isFreePlanId(planId: string | null | undefined): boolean {
  if (!planId) return false
  return planId.toLowerCase() === FREE_PLAN_ID
}

export function isTrialPlanId(planId: string | null | undefined): boolean {
  return !planId || planId.toLowerCase() === TRIAL_PLAN_ID
}

/** Active Divine Trial (card on file): full app shell, not protection-only. */
export function hasActiveDivineTrial(row: SubscriptionLike | null | undefined): boolean {
  if (!row?.plan_id) return false
  const st = (row.status || '').toLowerCase()
  if (st !== 'active' && st !== 'trialing') return false
  return isTrialPlanId(row.plan_id)
}

/** Stripe customer row fields used only for trial-offer UI (billing settings). */
export type TrialOfferFields = SubscriptionLike & {
  stripe_subscription_id?: string | null
  trial_ends_at?: string | null
}

/**
 * True once the user has attached a payment method and has a Divine trial Stripe subscription row,
 * including brief windows where DB `status` still reads `trial` while Stripe is already `trialing`.
 */
export function isDivineTrialSeatHeld(row: TrialOfferFields | null | undefined): boolean {
  if (!row?.plan_id) return false
  if (!isTrialPlanId(row.plan_id)) return false
  if (hasActiveDivineTrial(row)) return true
  return Boolean(row.stripe_subscription_id?.trim())
}

/**
 * Whether to show the “Start free trial (card required)” card on Billing.
 * Hide when paid, already entitled to Divine trial, checkout has created a Stripe subscription,
 * or the account has moved past a first trial (free plan, canceled / unpaid, or trial end date passed).
 */
export function shouldShowDivineTrialStartCard(row: TrialOfferFields | null | undefined): boolean {
  if (!row?.plan_id && !row?.status) return true

  if (isPaidSubscription(row)) return false
  if (hasActiveDivineTrial(row)) return false
  if (isDivineTrialSeatHeld(row)) return false

  const st = (row.status || '').toLowerCase()

  if (row.plan_id && isFreePlanId(row.plan_id)) return false

  if (['canceled', 'unpaid', 'incomplete_expired'].includes(st)) return false

  if (row.trial_ends_at) {
    const endMs = Date.parse(String(row.trial_ends_at))
    if (!Number.isNaN(endMs) && endMs < Date.now() && st !== 'trialing') return false
  }

  return true
}

/** Short label for Plan & billing subtitle + dashboard chip (“Trial redeemed” / “Trial expired”). */
export type DivineTrialSubtitleBadge = 'expired' | 'redeemed' | null

export function divineTrialSubtitleBadge(row: TrialOfferFields | null | undefined): DivineTrialSubtitleBadge {
  if (!row?.plan_id && !row?.status) return null
  if (isPaidSubscription(row)) return null

  const st = (row.status || '').toLowerCase()

  const lapsedToFree =
    row.plan_id != null &&
    isFreePlanId(row.plan_id) &&
    ['canceled', 'unpaid'].includes(st)

  const trialEndMs = row.trial_ends_at ? Date.parse(String(row.trial_ends_at)) : NaN
  const trialEndedByClock =
    Number.isFinite(trialEndMs) && trialEndMs < Date.now() && !hasActiveDivineTrial(row)

  if (lapsedToFree || trialEndedByClock) return 'expired'

  if (hasActiveDivineTrial(row) || isDivineTrialSeatHeld(row)) return 'redeemed'

  return null
}

export function isProtectionPlanId(planId: string | null | undefined): boolean {
  if (!planId) return false
  return planId.toLowerCase() === PROTECTION_PLAN_ID
}

export interface ProtectionEntitlementFields {
  protection_plan_active?: boolean | null
  protection_stripe_subscription_id?: string | null
}

/** True when the $25/mo protection subscription is active (column synced from Stripe webhooks). */
export function isProtectionEntitled(row: ProtectionEntitlementFields | null | undefined): boolean {
  return row?.protection_plan_active === true
}

/**
 * Pro-tier AI tools that debit credits: paid subscription or active Divine trial.
 * Credit sufficiency is enforced separately via requireAiToolSessionAndCredits / consumeAiCredits.
 */
export function canUseCreditGatedProFeature(row: SubscriptionLike | null | undefined): boolean {
  return isPaidSubscription(row) || hasActiveDivineTrial(row)
}

/**
 * May start a new OnlyFans / Fansly partner (OnlyFansAPI / Fansly) link — per-account cost to Circe.
 * Same bar as Pro credit-gated tools; keep one entry point if policy diverges later.
 */
export function canConnectAdultPartnerPlatform(row: SubscriptionLike | null | undefined): boolean {
  return canUseCreditGatedProFeature(row)
}

/**
 * Can open the main API dashboard (revenue tools, DMs, etc.): cev-paid or legacy — not protection-only.
 * Use with `isProtectionEntitled` for stacked users.
 */
export function isMainApiPaid(row: SubscriptionLike | null | undefined): boolean {
  return isPaidSubscription(row)
}

/**
 * True for the Divine trial SKU while the subscription is not in a definitively ended state.
 * Used so stacked Protection + trial (checkout, incomplete, `trial` status, etc.) still get full
 * creator nav — including Divine Manager — not only when Stripe already reports `trialing`.
 */
export function isDivineTrialPlanNotLapsed(row: SubscriptionLike | null | undefined): boolean {
  if (!row?.plan_id || row.plan_id.toLowerCase() !== TRIAL_PLAN_ID) return false
  const st = (row.status || '').toLowerCase()
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(st)) return false
  return true
}

/**
 * $25/mo Protection without Pro/trial — non-API capability tier (manual workflows + protection).
 * Excludes Divine trial (all non-lapsed states) and trial seat held so trialists keep the full dashboard.
 */
export function isProtectionOnlyTier(
  row: (SubscriptionLike & ProtectionEntitlementFields) | null | undefined,
): boolean {
  if (!isProtectionEntitled(row)) return false
  if (isPaidSubscription(row)) return false
  if (hasActiveDivineTrial(row)) return false
  if (isDivineTrialSeatHeld(row as TrialOfferFields)) return false
  if (isDivineTrialPlanNotLapsed(row)) return false
  return true
}
