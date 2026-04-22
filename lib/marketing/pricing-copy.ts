/**
 * Canonical **copy** for the subscription model (revenue bands × Focus/Unified).
 * Dollar amounts and tiers always come from `lib/circe-venus-pricing.ts` (via `lib/pricing-matrix.ts`).
 *
 * Also update shared UI: `PricingModelInlineBlurb`, `PricingModelHeadline`, `LandingPricingSection`,
 * and `lib/seo/pricing-seo` when positioning changes.
 */

export const PRICING_MODEL_HEADLINE = 'Simple plans. One workspace.'

export const PRICING_MODEL_TRIAL_LINE =
  'Start with a 14-day free trial. No credit card required.'

/** One line for pricing + credits (amounts come from live tier math in UI). */
export const CREDIT_ALLOWANCE_MARKETING_LINE =
  'Paid plans include 20% of your subscription as AI credits each month — for example $100/mo gives $20 in credits (2,000 credits). $1 of subscription = 100 credits.'
