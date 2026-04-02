/**
 * Revenue-tier × Single vs Multi monthly pricing (USD).
 * Single = OnlyFans only; Multi = OnlyFans + other adult platforms (Fansly, ManyVids, etc.).
 */

export type BillingVariant = 'single' | 'multi'

export interface RevenueTierRow {
  /** 0..10 */
  tierIndex: number
  /** UI label e.g. "Under $1,000" */
  label: string
  /** Minimum monthly revenue (USD) for this band; inclusive */
  minUsd: number
  /** Maximum monthly revenue (USD); null = unbounded (top tier) */
  maxUsd: number | null
  singlePriceUsd: number
  multiPriceUsd: number
}

/** 11 tiers — amounts match product pricing table */
export const REVENUE_TIERS: readonly RevenueTierRow[] = [
  { tierIndex: 0, label: 'Under $1,000', minUsd: 0, maxUsd: 1000, singlePriceUsd: 35, multiPriceUsd: 50 },
  { tierIndex: 1, label: '$1k – $5k', minUsd: 1000, maxUsd: 5000, singlePriceUsd: 50, multiPriceUsd: 75 },
  { tierIndex: 2, label: '$5k – $7.5k', minUsd: 5000, maxUsd: 7500, singlePriceUsd: 75, multiPriceUsd: 100 },
  { tierIndex: 3, label: '$7.5k – $10k', minUsd: 7500, maxUsd: 10000, singlePriceUsd: 100, multiPriceUsd: 140 },
  { tierIndex: 4, label: '$10k – $15k', minUsd: 10000, maxUsd: 15000, singlePriceUsd: 125, multiPriceUsd: 175 },
  { tierIndex: 5, label: '$15k – $25k', minUsd: 15000, maxUsd: 25000, singlePriceUsd: 175, multiPriceUsd: 245 },
  { tierIndex: 6, label: '$25k – $35k', minUsd: 25000, maxUsd: 35000, singlePriceUsd: 225, multiPriceUsd: 315 },
  { tierIndex: 7, label: '$35k – $45k', minUsd: 35000, maxUsd: 45000, singlePriceUsd: 275, multiPriceUsd: 385 },
  { tierIndex: 8, label: '$45k – $60k', minUsd: 45000, maxUsd: 60000, singlePriceUsd: 350, multiPriceUsd: 490 },
  { tierIndex: 9, label: '$60k – $80k', minUsd: 60000, maxUsd: 80000, singlePriceUsd: 425, multiPriceUsd: 595 },
  { tierIndex: 10, label: '$80k+', minUsd: 80000, maxUsd: null, singlePriceUsd: 500, multiPriceUsd: 700 },
] as const

export const TIER_COUNT = REVENUE_TIERS.length

export function getTierByIndex(index: number): RevenueTierRow | undefined {
  return REVENUE_TIERS.find((t) => t.tierIndex === index)
}

/** Map self-reported monthly revenue (USD) to tier index 0..10 (band boundaries match product table). */
export function tierIndexFromMonthlyRevenue(monthlyRevenueUsd: number): number {
  const x = Math.max(0, monthlyRevenueUsd)
  if (x < 1000) return 0
  if (x < 5000) return 1
  if (x < 7500) return 2
  if (x < 10000) return 3
  if (x < 15000) return 4
  if (x < 25000) return 5
  if (x < 35000) return 6
  if (x < 45000) return 7
  if (x < 60000) return 8
  if (x < 80000) return 9
  return 10
}

export function getMonthlyPriceUsd(variant: BillingVariant, tierIndex: number): number {
  const row = getTierByIndex(tierIndex)
  if (!row) throw new Error(`Invalid tier index: ${tierIndex}`)
  return variant === 'single' ? row.singlePriceUsd : row.multiPriceUsd
}

export function getMonthlyPriceCents(variant: BillingVariant, tierIndex: number): number {
  const usd = getMonthlyPriceUsd(variant, tierIndex)
  return Math.round(usd * 100)
}

export function checkoutProductName(variant: BillingVariant, tierIndex: number): string {
  const row = getTierByIndex(tierIndex)
  if (!row) return 'Circe et Venus'
  const v = variant === 'single' ? 'Single (OnlyFans)' : 'Multi (OF + platforms)'
  return `Circe et Venus — ${v} — ${row.label}`
}

export function checkoutProductDescription(variant: BillingVariant, tierIndex: number): string {
  const row = getTierByIndex(tierIndex)
  if (!row) return 'Monthly subscription'
  return variant === 'single'
    ? `Monthly · ${row.label} · OnlyFans-focused plan`
    : `Monthly · ${row.label} · OnlyFans plus additional connected platforms`
}
