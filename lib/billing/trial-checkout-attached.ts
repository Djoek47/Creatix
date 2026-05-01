import { TRIAL_PLAN_ID } from '@/lib/billing/access'

/** Minimal subscription row for “trial card captured?” (matches dashboard layout select). */
export type TrialBillingSignalRow = {
  stripe_subscription_id?: string | null
  plan_id?: string | null
  status?: string | null
}

/**
 * True after trial setup has produced billable state server-side:
 * Stripe subscription id present (primary), or divine-trial row in trialing/active before id sync.
 * Aligns intent with duplicate-trial guard in `startCheckoutSession`.
 */
export function hasTrialBillingAttached(row: TrialBillingSignalRow | null | undefined): boolean {
  if (!row) return false
  if (row.stripe_subscription_id) return true
  const pid = String(row.plan_id ?? '').toLowerCase()
  const st = String(row.status ?? '').toLowerCase()
  return pid === TRIAL_PLAN_ID && (st === 'trialing' || st === 'active')
}
