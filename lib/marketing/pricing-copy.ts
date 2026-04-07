/**
 * Canonical **copy** for the subscription model (revenue bands × Focus/Unified).
 * Dollar amounts and tiers always come from `lib/circe-venus-pricing.ts` (via `lib/pricing-matrix.ts`).
 *
 * Also update shared UI: `PricingModelInlineBlurb`, `PricingModelHeadline`, `LandingPricingSection`,
 * and `lib/seo/pricing-seo` when positioning changes.
 */

export const PRICING_MODEL_HEADLINE = 'Revenue-based Focus & Unified'

export const PRICING_MODEL_TRIAL_LINE =
  'Start with a 14-day free trial. No credit card required.'
