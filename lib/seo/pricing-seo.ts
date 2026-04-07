/**
 * SEO copy and structured data derived from {@link ../circe-venus-pricing} so SERP snippets
 * and JSON-LD stay aligned when bands or add-ons change.
 */

import { PRICING_TIERS, BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'

const TIER_COUNT = PRICING_TIERS.length

function firstTier() {
  return PRICING_TIERS[0]
}

function lastTier() {
  return PRICING_TIERS[TIER_COUNT - 1]
}

/** Meta / OG description: concrete USD ranges from the live matrix. */
export function buildPricingMetaDescription(): string {
  const low = firstTier()
  const high = lastTier()
  const ofMin = low.prices.of
  const ofMax = high.prices.of
  const uniMin = low.prices.unified
  const uniMax = high.prices.unified
  const mv = BUNDLE_ADDONS.MV_FLAT
  return `Creator CRM pricing by monthly revenue: OnlyFans Focus $${ofMin}–$${ofMax}/mo, Unified $${uniMin}–$${uniMax}/mo, ManyVids Focus $${mv}/mo. Bundles: OF+Fansly +$${BUNDLE_ADDONS.FL_ON_OF}, OF+MV +$${BUNDLE_ADDONS.MV_ON_OF}, Unified +$${BUNDLE_ADDONS.UNIFIED_ON_OF} on OF base. 14-day trial, per-seat billing.`
}

/** Short line for landing / cross-links (keep under ~120 chars). */
export function buildHomePricingTeaserLine(): string {
  const minOf = firstTier().prices.of
  const maxUni = lastTier().prices.unified
  return `Transparent pricing from $${minOf}/mo (OnlyFans Focus) to $${maxUni}/mo (Unified).`
}

/** Extra keywords including current entry price for long-tail queries. */
export function buildPricingKeywords(): string[] {
  const minOf = firstTier().prices.of
  return [
    'creator pricing',
    'OnlyFans tools pricing',
    'Fansly pricing',
    'ManyVids',
    'revenue-based subscription',
    'Circe et Venus',
    'creator SaaS',
    'Focus plan',
    'Unified plan',
    'per-seat billing',
    `OnlyFans CRM $${minOf}`,
    'adult creator platform pricing',
  ]
}

/**
 * Schema.org graph fragments for /pricing: Product + AggregateOffer (monthly USD range).
 */
export function buildPricingProductOfferGraph(pricingPageUrl: string): Record<string, unknown>[] {
  const low = firstTier()
  const high = lastTier()
  const minMonthly = Math.min(low.prices.of, BUNDLE_ADDONS.MV_FLAT)
  const maxMonthly = high.prices.unified

  return [
    {
      '@type': 'Product',
      '@id': `${pricingPageUrl}#subscription-product`,
      name: 'Circe et Venus — creator subscription',
      description: buildPricingMetaDescription(),
      brand: {
        '@type': 'Brand',
        name: 'Circe et Venus',
      },
      offers: {
        '@type': 'AggregateOffer',
        url: pricingPageUrl,
        priceCurrency: 'USD',
        lowPrice: minMonthly,
        highPrice: maxMonthly,
        offerCount: TIER_COUNT * 6,
        availability: 'https://schema.org/InStock',
      },
    },
  ]
}
