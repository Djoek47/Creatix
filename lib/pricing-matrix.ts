/**
 * Revenue-tier pricing (USD): Focus = one adult platform (per-platform monthly price);
 * Unified (multi) = all adult platforms in one workspace.
 */

import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'

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
  focusOnlyfansUsd: number
  focusFanslyUsd: number
  focusManyvidsUsd: number
  /** Unified (multi-platform) price */
  multiPriceUsd: number
}

/** 11 tiers — Focus prices differ by platform; Unified uses multi column */
export const REVENUE_TIERS: readonly RevenueTierRow[] = [
  {
    tierIndex: 0,
    label: 'Under $1,000',
    minUsd: 0,
    maxUsd: 1000,
    focusOnlyfansUsd: 35,
    focusFanslyUsd: 30,
    focusManyvidsUsd: 40,
    multiPriceUsd: 50,
  },
  {
    tierIndex: 1,
    label: '$1k – $5k',
    minUsd: 1000,
    maxUsd: 5000,
    focusOnlyfansUsd: 50,
    focusFanslyUsd: 45,
    focusManyvidsUsd: 55,
    multiPriceUsd: 75,
  },
  {
    tierIndex: 2,
    label: '$5k – $7.5k',
    minUsd: 5000,
    maxUsd: 7500,
    focusOnlyfansUsd: 75,
    focusFanslyUsd: 70,
    focusManyvidsUsd: 80,
    multiPriceUsd: 100,
  },
  {
    tierIndex: 3,
    label: '$7.5k – $10k',
    minUsd: 7500,
    maxUsd: 10000,
    focusOnlyfansUsd: 100,
    focusFanslyUsd: 95,
    focusManyvidsUsd: 105,
    multiPriceUsd: 140,
  },
  {
    tierIndex: 4,
    label: '$10k – $15k',
    minUsd: 10000,
    maxUsd: 15000,
    focusOnlyfansUsd: 125,
    focusFanslyUsd: 120,
    focusManyvidsUsd: 130,
    multiPriceUsd: 175,
  },
  {
    tierIndex: 5,
    label: '$15k – $25k',
    minUsd: 15000,
    maxUsd: 25000,
    focusOnlyfansUsd: 175,
    focusFanslyUsd: 170,
    focusManyvidsUsd: 180,
    multiPriceUsd: 245,
  },
  {
    tierIndex: 6,
    label: '$25k – $35k',
    minUsd: 25000,
    maxUsd: 35000,
    focusOnlyfansUsd: 225,
    focusFanslyUsd: 220,
    focusManyvidsUsd: 230,
    multiPriceUsd: 315,
  },
  {
    tierIndex: 7,
    label: '$35k – $45k',
    minUsd: 35000,
    maxUsd: 45000,
    focusOnlyfansUsd: 275,
    focusFanslyUsd: 270,
    focusManyvidsUsd: 280,
    multiPriceUsd: 385,
  },
  {
    tierIndex: 8,
    label: '$45k – $60k',
    minUsd: 45000,
    maxUsd: 60000,
    focusOnlyfansUsd: 350,
    focusFanslyUsd: 345,
    focusManyvidsUsd: 355,
    multiPriceUsd: 490,
  },
  {
    tierIndex: 9,
    label: '$60k – $80k',
    minUsd: 60000,
    maxUsd: 80000,
    focusOnlyfansUsd: 425,
    focusFanslyUsd: 420,
    focusManyvidsUsd: 430,
    multiPriceUsd: 595,
  },
  {
    tierIndex: 10,
    label: '$80k+',
    minUsd: 80000,
    maxUsd: null,
    focusOnlyfansUsd: 500,
    focusFanslyUsd: 495,
    focusManyvidsUsd: 505,
    multiPriceUsd: 700,
  },
] as const

export const TIER_COUNT = REVENUE_TIERS.length

export function getTierByIndex(index: number): RevenueTierRow | undefined {
  return REVENUE_TIERS.find((t) => t.tierIndex === index)
}

export function focusPriceUsd(row: RevenueTierRow, platform: AdultBillingPlatform): number {
  if (platform === 'onlyfans') return row.focusOnlyfansUsd
  if (platform === 'fansly') return row.focusFanslyUsd
  return row.focusManyvidsUsd
}

export function focusPlatformDisplayName(platform: AdultBillingPlatform): string {
  if (platform === 'onlyfans') return 'OnlyFans'
  if (platform === 'fansly') return 'Fansly'
  return 'ManyVids'
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

/**
 * Monthly USD for the subscription. For Focus (`single`), pass the chosen platform; defaults to OnlyFans.
 */
export function getMonthlyPriceUsd(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatform: AdultBillingPlatform = 'onlyfans',
): number {
  const row = getTierByIndex(tierIndex)
  if (!row) throw new Error(`Invalid tier index: ${tierIndex}`)
  if (variant === 'multi') return row.multiPriceUsd
  return focusPriceUsd(row, focusPlatform)
}

export function getMonthlyPriceCents(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatform: AdultBillingPlatform = 'onlyfans',
): number {
  const usd = getMonthlyPriceUsd(variant, tierIndex, focusPlatform)
  return Math.round(usd * 100)
}

export function checkoutProductName(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatform: AdultBillingPlatform = 'onlyfans',
): string {
  const row = getTierByIndex(tierIndex)
  if (!row) return 'Circe et Venus'
  if (variant === 'multi') {
    return `Circe et Venus — Unified — ${row.label}`
  }
  return `Circe et Venus — Focus (${focusPlatformDisplayName(focusPlatform)}) — ${row.label}`
}

export function checkoutProductDescription(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatform: AdultBillingPlatform = 'onlyfans',
): string {
  const row = getTierByIndex(tierIndex)
  if (!row) return 'Monthly subscription'
  if (variant === 'multi') {
    return `Monthly · ${row.label} · All adult platforms in one workspace`
  }
  return `Monthly · ${row.label} · Full tools for ${focusPlatformDisplayName(focusPlatform)} only`
}
