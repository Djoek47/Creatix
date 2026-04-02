import type Stripe from 'stripe'

/**
 * Stripe API 2026+ exposes billing period bounds on subscription items, not the subscription root.
 */
export function getSubscriptionPeriodSeconds(sub: Stripe.Subscription): {
  start: number
  end: number
} | null {
  const item = sub.items?.data?.[0]
  if (item == null) return null
  return {
    start: item.current_period_start,
    end: item.current_period_end,
  }
}
