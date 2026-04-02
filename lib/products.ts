export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  priceMonthly?: number
  features: string[]
  popular?: boolean
  mode: 'payment' | 'subscription'
}

/** Shared feature list for paid (revenue-tier) plans — price varies by tier + Single/Multi */
export const PAID_TIER_FEATURES: readonly string[] = [
  'Unlimited AI credits',
  'Full storage allocation',
  'Advanced analytics & protection',
  'Priority support',
]

// Public catalog: trial + reference to paid matrix (see /pricing and Settings → Billing)
export const PRODUCTS: Product[] = [
  {
    id: 'divine-trial',
    name: 'Divine Trial',
    description: '14-day free trial with limited features',
    priceInCents: 0,
    priceMonthly: 0,
    features: [
      '100 AI credits/month',
      '5GB storage',
      'Basic analytics',
      'Email support',
    ],
    mode: 'payment',
  },
]

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}
