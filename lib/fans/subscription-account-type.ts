/** CRM: free-page follower vs paid subscription (from platform list price). */

export type SubscriptionAccountType = 'free' | 'paid' | 'unknown'

export function subscriptionAccountTypeFromPrice(
  price: number | null | undefined,
): SubscriptionAccountType {
  if (price == null || Number.isNaN(Number(price))) return 'unknown'
  const n = Number(price)
  if (n <= 0) return 'free'
  return 'paid'
}

export function formatFanCommerceContextForAi(opts: {
  subscriptionAccountType: SubscriptionAccountType
  subscriptionPrice: number | null | undefined
  subscriptionStatus?: string | null
}): string {
  const price =
    opts.subscriptionPrice != null && !Number.isNaN(Number(opts.subscriptionPrice))
      ? Number(opts.subscriptionPrice)
      : null
  const priceBit =
    price != null ? ` Listed subscription price: $${price.toFixed(2)}/period (platform snapshot).` : ''
  const status =
    typeof opts.subscriptionStatus === 'string' && opts.subscriptionStatus.trim()
      ? ` Subscription status: ${opts.subscriptionStatus.trim()}.`
      : ''
  const kind =
    opts.subscriptionAccountType === 'free'
      ? 'This fan follows on a free subscription tier ($0 list price). They may not see paywalled feed posts until they pay; PPV DMs and bundles still apply.'
      : opts.subscriptionAccountType === 'paid'
        ? 'This fan is on a paid subscription tier (non-zero list price). They likely see subscriber feed content; PPV/locked bundles may still require separate unlock.'
        : 'Subscription tier (free vs paid) is unknown — do not assume full feed access; clarify offers as PPV/sub-add-ons when relevant.'
  return `${kind}${priceBit}${status}`
}
