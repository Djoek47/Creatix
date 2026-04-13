import { isPaidPlanId } from '@/lib/billing/access'

/** Storage caps keyed off `subscriptions.plan_id`. AI credits are not set here — use {@link computeMonthlyCreditAllowance}. */
export function getPlanLimits(planId: string) {
  if (isPaidPlanId(planId)) {
    return { storage_limit_mb: 999999 }
  }
  switch (planId) {
    case 'divine-trial':
    default:
      return { storage_limit_mb: 5120 }
  }
}
