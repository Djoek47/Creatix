export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  priceMonthly?: number
  credits?: number
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
  {
    id: 'credit-topup-2000',
    name: 'Credit Top-Up · 2,000 credits',
    description: 'One-time top-up for extra usage this cycle',
    priceInCents: 2000,
    credits: 2000,
    features: ['2,000 credits', 'Rolls one extra month', 'Applies instantly after Stripe confirms'],
    mode: 'payment',
  },
  {
    id: 'credit-topup-5000',
    name: 'Credit Top-Up · 5,000 credits',
    description: 'One-time top-up for heavier monthly usage',
    priceInCents: 5000,
    credits: 5000,
    features: ['5,000 credits', 'Rolls one extra month', 'Best for DM + leak scan workflows'],
    mode: 'payment',
  },
  {
    id: 'credit-topup-10000',
    name: 'Credit Top-Up · 10,000 credits',
    description: 'One-time top-up for power users and agencies',
    priceInCents: 10000,
    credits: 10000,
    features: ['10,000 credits', 'Rolls one extra month', 'For high-volume operations'],
    mode: 'payment',
  },
]

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}
