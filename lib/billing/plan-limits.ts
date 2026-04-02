import { isPaidPlanId } from '@/lib/billing/access'

/** Usage limits keyed off `subscriptions.plan_id` (paid tiers share unlimited caps). */
export function getPlanLimits(planId: string) {
  if (isPaidPlanId(planId)) {
    return { ai_credits_limit: 999999, storage_limit_mb: 999999 }
  }
  switch (planId) {
    case 'divine-trial':
    default:
      return { ai_credits_limit: 100, storage_limit_mb: 5120 }
  }
}
