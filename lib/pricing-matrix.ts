/**
 * Revenue-tier pricing (USD): Focus = 1–2 adult platforms (OF base, Fansly −10%, ManyVids −25%);
 * two-platform Focus = mean (default) or max of the two; Unified = multi column unchanged.
 */

import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { sortFocusPlatforms } from '@/lib/billing/platform-variant'

export type BillingVariant = 'single' | 'multi'

/** Set to `'max'` to charge the higher of the two platform prices instead of the rounded mean. */
export type FocusTwoPlatformPriceMode = 'mean_rounded' | 'max'

export const FOCUS_TWO_PLATFORM_PRICE_MODE: FocusTwoPlatformPriceMode = 'mean_rounded'

export interface RevenueTierRow {
  /** 0..10 */
  tierIndex: number
  label: string
  minUsd: number
  maxUsd: number | null
  /** OnlyFans Focus base (canonical); Fansly/ManyVids derived */
  focusBaseUsd: number
  /** Unified — unchanged “original” multi price */
  multiPriceUsd: number
}

/** 11 tiers — only base + Unified stored; FL/MV computed from base */
export const REVENUE_TIERS: readonly RevenueTierRow[] = [
  { tierIndex: 0, label: 'Under $1,000', minUsd: 0, maxUsd: 1000, focusBaseUsd: 35, multiPriceUsd: 50 },
  { tierIndex: 1, label: '$1k – $5k', minUsd: 1000, maxUsd: 5000, focusBaseUsd: 50, multiPriceUsd: 75 },
  { tierIndex: 2, label: '$5k – $7.5k', minUsd: 5000, maxUsd: 7500, focusBaseUsd: 75, multiPriceUsd: 100 },
  { tierIndex: 3, label: '$7.5k – $10k', minUsd: 7500, maxUsd: 10000, focusBaseUsd: 100, multiPriceUsd: 140 },
  { tierIndex: 4, label: '$10k – $15k', minUsd: 10000, maxUsd: 15000, focusBaseUsd: 125, multiPriceUsd: 175 },
  { tierIndex: 5, label: '$15k – $25k', minUsd: 15000, maxUsd: 25000, focusBaseUsd: 175, multiPriceUsd: 245 },
  { tierIndex: 6, label: '$25k – $35k', minUsd: 25000, maxUsd: 35000, focusBaseUsd: 225, multiPriceUsd: 315 },
  { tierIndex: 7, label: '$35k – $45k', minUsd: 35000, maxUsd: 45000, focusBaseUsd: 275, multiPriceUsd: 385 },
  { tierIndex: 8, label: '$45k – $60k', minUsd: 45000, maxUsd: 60000, focusBaseUsd: 350, multiPriceUsd: 490 },
  { tierIndex: 9, label: '$60k – $80k', minUsd: 60000, maxUsd: 80000, focusBaseUsd: 425, multiPriceUsd: 595 },
  { tierIndex: 10, label: '$80k+', minUsd: 80000, maxUsd: null, focusBaseUsd: 500, multiPriceUsd: 700 },
] as const

export const TIER_COUNT = REVENUE_TIERS.length

export function getTierByIndex(index: number): RevenueTierRow | undefined {
  return REVENUE_TIERS.find((t) => t.tierIndex === index)
}

export function focusFanslyUsd(row: RevenueTierRow): number {
  return Math.round(row.focusBaseUsd * 0.9)
}

export function focusManyvidsUsd(row: RevenueTierRow): number {
  return Math.round(row.focusBaseUsd * 0.75)
}

export function focusPriceUsd(row: RevenueTierRow, platform: AdultBillingPlatform): number {
  if (platform === 'onlyfans') return row.focusBaseUsd
  if (platform === 'fansly') return focusFanslyUsd(row)
  return focusManyvidsUsd(row)
}

/** Two distinct platforms; order-independent. */
export function twoPlatformFocusUsd(
  row: RevenueTierRow,
  a: AdultBillingPlatform,
  b: AdultBillingPlatform,
): number {
  const p1 = focusPriceUsd(row, a)
  const p2 = focusPriceUsd(row, b)
  if (FOCUS_TWO_PLATFORM_PRICE_MODE === 'max') return Math.max(p1, p2)
  return Math.round((p1 + p2) / 2)
}

export function focusPlatformDisplayName(platform: AdultBillingPlatform): string {
  if (platform === 'onlyfans') return 'OnlyFans'
  if (platform === 'fansly') return 'Fansly'
  return 'ManyVids'
}

export function focusPlatformsShortLabel(platforms: AdultBillingPlatform[]): string {
  const s = sortFocusPlatforms(platforms)
  if (s.length === 0) return 'OnlyFans'
  if (s.length === 1) return focusPlatformDisplayName(s[0])
  return s.map((p) => focusPlatformDisplayName(p)).join(' + ')
}

function normalizeFocusPlatformsInput(
  platforms: AdultBillingPlatform[] | undefined | null,
): AdultBillingPlatform[] {
  if (!platforms?.length) return ['onlyfans']
  const sorted = sortFocusPlatforms(platforms)
  if (sorted.length === 0) return ['onlyfans']
  if (sorted.length > 2) {
    throw new Error('Focus supports at most 2 platforms; use Unified for all three.')
  }
  return sorted
}

/** Monthly USD for Focus (1–2 platforms) or Unified. */
export function getMonthlyPriceUsd(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): number {
  const row = getTierByIndex(tierIndex)
  if (!row) throw new Error(`Invalid tier index: ${tierIndex}`)
  if (variant === 'multi') return row.multiPriceUsd
  const fps = normalizeFocusPlatformsInput(focusPlatforms ?? undefined)
  if (fps.length === 1) return focusPriceUsd(row, fps[0])
  return twoPlatformFocusUsd(row, fps[0], fps[1])
}

export function getMonthlyPriceCents(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): number {
  const usd = getMonthlyPriceUsd(variant, tierIndex, focusPlatforms)
  return Math.round(usd * 100)
}

export function checkoutProductName(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): string {
  const row = getTierByIndex(tierIndex)
  if (!row) return 'Circe et Venus'
  if (variant === 'multi') {
    return `Circe et Venus — Unified — ${row.label}`
  }
  const fps = normalizeFocusPlatformsInput(focusPlatforms ?? undefined)
  const label = focusPlatformsShortLabel(fps)
  return `Circe et Venus — Focus (${label}) — ${row.label}`
}

export function checkoutProductDescription(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): string {
  const row = getTierByIndex(tierIndex)
  if (!row) return 'Monthly subscription'
  if (variant === 'multi') {
    return `Monthly · ${row.label} · All adult platforms in one workspace`
  }
  const fps = normalizeFocusPlatformsInput(focusPlatforms ?? undefined)
  if (fps.length === 1) {
    return `Monthly · ${row.label} · Full tools for ${focusPlatformDisplayName(fps[0])}`
  }
  return `Monthly · ${row.label} · Full tools for ${focusPlatformDisplayName(fps[0])} and ${focusPlatformDisplayName(fps[1])}`
}

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
