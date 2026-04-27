/**
 * SEO copy and structured data derived from {@link ../circe-venus-pricing} so SERP snippets
 * and JSON-LD stay aligned when bands or add-ons change.
 */

import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { getProduct } from '@/lib/products'
import { PROTECTION_PLAN_ID } from '@/lib/billing/access'

const TIER_COUNT = PRICING_TIERS.length

const protectionProduct = getProduct('cev-protection') ?? { priceMonthly: 25, name: 'Protection' }

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
  const bMin = low.prices.of_fl
  const bMax = high.prices.of_fl
  const prot = protectionProduct.priceMonthly ?? 25
  return `Creator CRM pricing by monthly revenue: OnlyFans $${ofMin}–$${ofMax}/mo, Fansly line per band, Bundled (OF+FL) $${bMin}–$${bMax}/mo. Protection & Anti-Piracy (non-API platforms) $${prot}/mo add-on. 2-day trial (card required), per-seat billing on main plans.`
}

/** Short line for landing / cross-links (keep under ~120 chars). */
export function buildHomePricingTeaserLine(): string {
  const minOf = firstTier().prices.of
  const maxBundled = lastTier().prices.of_fl
  return `Transparent pricing from $${minOf}/mo (OnlyFans Focus) to $${maxBundled}/mo (Bundled). Protection add-on from $${protectionProduct.priceMonthly}/mo.`
}

/** Extra keywords including current entry price for long-tail queries. */
export function buildPricingKeywords(): string[] {
  const minOf = firstTier().prices.of
  return [
    'creator pricing',
    'OnlyFans tools pricing',
    'Fansly pricing',
    'ManyVids',
    'anti-piracy protection',
    'revenue-based subscription',
    'Circe et Venus',
    'creator SaaS',
    'Focus plan',
    'Bundled plan',
    PROTECTION_PLAN_ID,
    'per-seat billing',
    `OnlyFans CRM $${minOf}`,
    'adult creator platform pricing',
  ]
}

/**
 * Schema.org graph fragment for /pricing: SoftwareApplication + AggregateOffer.
 *
 * We intentionally do **not** use `Product` here: Google’s Product rich results expect
 * `aggregateRating` / `review` when a product is merchandised; we have no public review feed.
 * `SoftwareApplication` matches a web SaaS subscription and avoids that Product-snippet profile.
 */
export function buildPricingSoftwareOfferGraph(pricingPageUrl: string): Record<string, unknown>[] {
  const low = firstTier()
  const high = lastTier()
  const minMonthly = Math.min(low.prices.of, low.prices.fl)
  const maxMonthly = high.prices.of_fl
  const prot = protectionProduct.priceMonthly ?? 25

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': `${pricingPageUrl}#software`,
      name: 'Circe et Venus',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: buildPricingMetaDescription(),
      url: pricingPageUrl,
      provider: {
        '@type': 'Organization',
        name: 'Circe et Venus',
      },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: minMonthly,
        highPrice: maxMonthly,
        offerCount: TIER_COUNT,
        description: `Main plans ${minMonthly}–${maxMonthly} USD/mo; Protection add-on ${prot} USD/mo (stackable)`,
        url: pricingPageUrl,
        availability: 'https://schema.org/InStock',
      },
    },
  ]
}
