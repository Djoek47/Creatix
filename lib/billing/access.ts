/**
 * Central paid / trial checks for subscriptions (revenue-tier model + legacy plan IDs).
 */

/** Canonical paid plan after revenue-tier migration */
export const PAID_PLAN_ID = 'cev-paid'

/** Flat $25/mo Protection & Anti-Piracy (separate Stripe subscription; can stack with cev-paid or standalone) */
export const PROTECTION_PLAN_ID = 'cev-protection'

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
 * Can open the main API dashboard (revenue tools, DMs, etc.): cev-paid or legacy — not protection-only.
 * Use with `isProtectionEntitled` for stacked users.
 */
export function isMainApiPaid(row: SubscriptionLike | null | undefined): boolean {
  return isPaidSubscription(row)
}

/**
 * $25/mo Protection without Pro/trial — non-API capability tier (manual workflows + protection).
 * Excludes active `divine-trial` so trialists keep the full dashboard until they convert or lapse.
 */
export function isProtectionOnlyTier(
  row: (SubscriptionLike & ProtectionEntitlementFields) | null | undefined,
): boolean {
  if (!isProtectionEntitled(row)) return false
  if (isPaidSubscription(row)) return false
  if (hasActiveDivineTrial(row)) return false
  return true
}
