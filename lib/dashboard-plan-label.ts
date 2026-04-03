import { isPaidPlanId, TRIAL_PLAN_ID } from '@/lib/billing/access'
import { focusPlatformDisplayName } from '@/lib/pricing-matrix'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'

export type SubscriptionRowForPlan = {
  plan_id: string | null
  status: string | null
  revenue_band_label?: string | null
  billing_variant?: string | null
  billing_focus_platform?: string | null
}

function focusLabel(raw: string | null | undefined): string {
  if (raw === 'onlyfans' || raw === 'fansly' || raw === 'manyvids') {
    return focusPlatformDisplayName(raw as AdultBillingPlatform)
  }
  return 'OnlyFans'
}

/** Short label for dashboard hero chip (no PII). */
export function getDashboardPlanLabel(row: SubscriptionRowForPlan | null | undefined): string | null {
  if (!row?.plan_id) return 'Trial'
  const pid = row.plan_id.toLowerCase()
  const st = (row.status || '').toLowerCase()

  const paidish = st === 'active' || st === 'trialing'
  if (paidish && isPaidPlanId(pid)) {
    const band = row.revenue_band_label?.trim()
    if (band) {
      const variant =
        row.billing_variant === 'multi'
          ? 'Unified'
          : row.billing_variant === 'single'
            ? `Focus (${focusLabel(row.billing_focus_platform)})`
            : null
      return variant ? `Pro · ${band} (${variant})` : `Pro · ${band}`
    }
    if (pid === 'venus-pro') return 'Venus Pro'
    if (pid === 'circe-elite') return 'Circe Elite'
    if (pid === 'divine-duo') return 'Divine Duo'
    return 'Pro'
  }

  if (pid === TRIAL_PLAN_ID || st === 'trial') return 'Trial'

  return pid
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
