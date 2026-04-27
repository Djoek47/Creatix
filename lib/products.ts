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
    description: '2-day free trial (card required) with limited features',
    priceInCents: 0,
    priceMonthly: 0,
    features: [
      '100 AI credits total',
      '5GB storage',
      'Basic analytics',
      'Email support',
    ],
    mode: 'payment',
  },
  {
    id: 'credit-topup-2000',
    name: 'Credit Top-Up · 500 credits',
    description: 'One-time top-up for extra usage this cycle',
    priceInCents: 500,
    credits: 500,
    features: ['500 credits', 'Rolls one extra month', 'Applies instantly after Stripe confirms'],
    mode: 'payment',
  },
  {
    id: 'credit-topup-5000',
    name: 'Credit Top-Up · 1,000 credits',
    description: 'One-time top-up for heavier monthly usage',
    priceInCents: 1000,
    credits: 1000,
    features: ['1,000 credits', 'Rolls one extra month', 'Best for DM + leak scan workflows'],
    mode: 'payment',
  },
  {
    id: 'credit-topup-10000',
    name: 'Credit Top-Up · 2,000 credits',
    description: 'One-time top-up for power users and agencies',
    priceInCents: 2000,
    credits: 2000,
    features: ['2,000 credits', 'Rolls one extra month', 'For high-volume operations'],
    mode: 'payment',
  },
  {
    id: 'cev-protection',
    name: 'Protection & Anti-Piracy',
    description:
      'Anti-piracy and protection for Clips4Sale, ManyVids, Loyalfans, Fanvue, MYM, and other non-API surfaces. Can be used alone or with a main Creatix plan.',
    priceInCents: 2500,
    priceMonthly: 25,
    features: [
      'DMCA and leak-monitoring workflow',
      'Stackable with a main Creatix subscription',
      'Focused dashboard for non-API platform coverage',
    ],
    mode: 'subscription',
  },
]

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}
