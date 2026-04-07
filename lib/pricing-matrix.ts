/**
 * Revenue-tier pricing facade: checkout, UI, and billing gates use this module.
 * Canonical numbers and bands live in {@link ./circe-venus-pricing}.
 */

import {
  PRICING_TIERS,
  TIER_COUNT as CV_TIER_COUNT,
  tierIndexFromMonthlyRevenue as cvTierIndexFromMonthlyRevenue,
  BUNDLE_ADDONS,
  type PlatformCombo,
} from '@/lib/circe-venus-pricing'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { sortFocusPlatforms } from '@/lib/billing/platform-variant'

export type BillingVariant = 'single' | 'multi'

export interface RevenueTierRow {
  tierIndex: number
  label: string
  minUsd: number
  maxUsd: number | null
  focusBaseUsd: number
  multiPriceUsd: number
}

export const REVENUE_TIERS: readonly RevenueTierRow[] = PRICING_TIERS.map((t) => ({
  tierIndex: t.tierIndex,
  label: t.label,
  minUsd: t.revenueMin ?? 0,
  maxUsd: t.revenueMax,
  focusBaseUsd: t.prices.of,
  multiPriceUsd: t.prices.unified,
}))

export const TIER_COUNT = CV_TIER_COUNT

export const MANYVIDS_FOCUS_SINGLE_FLAT_USD = BUNDLE_ADDONS.MV_FLAT

export const FANSLY_FOCUS_MAX_USD = BUNDLE_ADDONS.FL_CAP

export function getTierByIndex(index: number): RevenueTierRow | undefined {
  return REVENUE_TIERS.find((t) => t.tierIndex === index)
}

function pricingTierAtIndex(index: number) {
  return PRICING_TIERS[index]
}

export function focusFanslyUsd(row: RevenueTierRow): number {
  const core = pricingTierAtIndex(row.tierIndex)
  return core?.prices.fl ?? Math.min(Math.round(row.focusBaseUsd * BUNDLE_ADDONS.FL_DISCOUNT), FANSLY_FOCUS_MAX_USD)
}

/** @deprecated Pair lines use fixed add-ons; kept for any code that expected a per-line MV “pair” quote. */
export function focusManyvidsPairUsd(row: RevenueTierRow): number {
  return Math.round(row.focusBaseUsd * 0.75)
}

export function focusManyvidsUsd(row: RevenueTierRow): number {
  return focusManyvidsPairUsd(row)
}

export function focusPairLineUsd(row: RevenueTierRow, platform: AdultBillingPlatform): number {
  const core = pricingTierAtIndex(row.tierIndex)
  if (!core) throw new Error(`Invalid tier: ${row.tierIndex}`)
  if (platform === 'onlyfans') return core.prices.of
  if (platform === 'fansly') return core.prices.fl
  return core.prices.mv
}

export function focusPriceUsd(row: RevenueTierRow, platform: AdultBillingPlatform): number {
  return focusPairLineUsd(row, platform)
}

function twoPlatformSetToCombo(a: AdultBillingPlatform, b: AdultBillingPlatform): PlatformCombo {
  const s = new Set<AdultBillingPlatform>([a, b])
  if (s.has('onlyfans') && s.has('fansly')) return 'of_fl'
  if (s.has('onlyfans') && s.has('manyvids')) return 'of_mv'
  if (s.has('fansly') && s.has('manyvids')) return 'fl_mv'
  throw new Error('twoPlatformSetToCombo: expected two distinct adult billing platforms')
}

/** @deprecated Old multiplier model; use {@link twoPlatformFocusUsd} which reads fixed bundle prices. */
export function twoPlatformBundleMultiplier(_a: AdultBillingPlatform, _b: AdultBillingPlatform): number {
  return 1
}

export function twoPlatformFocusUsd(
  row: RevenueTierRow,
  a: AdultBillingPlatform,
  b: AdultBillingPlatform,
): number {
  const core = pricingTierAtIndex(row.tierIndex)
  if (!core) throw new Error(`Invalid tier: ${row.tierIndex}`)
  const combo = twoPlatformSetToCombo(a, b)
  return core.prices[combo]
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

export function getMonthlyPriceUsd(
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms?: AdultBillingPlatform[] | null,
): number {
  const core = pricingTierAtIndex(tierIndex)
  if (!core) throw new Error(`Invalid tier index: ${tierIndex}`)
  if (variant === 'multi') return core.prices.unified
  const fps = normalizeFocusPlatformsInput(focusPlatforms ?? undefined)
  if (fps.length === 1) {
    if (fps[0] === 'manyvids') return core.prices.mv
    if (fps[0] === 'fansly') return core.prices.fl
    return core.prices.of
  }
  const row = getTierByIndex(tierIndex)
  if (!row) throw new Error(`Invalid tier index: ${tierIndex}`)
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
  return cvTierIndexFromMonthlyRevenue(monthlyRevenueUsd)
}

export function percentVsOnlyFansBase(row: RevenueTierRow, monthlyUsd: number): number {
  const b = row.focusBaseUsd
  if (!b) return 0
  return Math.round((1 - monthlyUsd / b) * 100)
}

export function percentSavingsTwoPlatformFocus(
  row: RevenueTierRow,
  a: AdultBillingPlatform,
  b: AdultBillingPlatform,
): number {
  return percentVsOnlyFansBase(row, twoPlatformFocusUsd(row, a, b))
}

/** Headline approximations for marketing; exact savings are band-specific (see calculator). */
export const FOCUS_PLATFORM_SAVINGS_PCT = {
  onlyfans: 0,
  fansly: Math.round((1 - BUNDLE_ADDONS.FL_DISCOUNT) * 100),
  /** ManyVids Focus solo is flat $39 — % vs OF varies by band; 0 = “see matrix”. */
  manyvids: 0,
} as const satisfies Record<AdultBillingPlatform, number>

export function pairBundleDescription(a: AdultBillingPlatform, b: AdultBillingPlatform): string {
  const s = new Set<AdultBillingPlatform>([a, b])
  if (s.has('onlyfans') && s.has('fansly')) {
    return `OnlyFans + Fansly: OnlyFans base + $${BUNDLE_ADDONS.FL_ON_OF}/mo (bundle)`
  }
  if (s.has('onlyfans') && s.has('manyvids')) {
    return `OnlyFans + ManyVids: OnlyFans base + $${BUNDLE_ADDONS.MV_ON_OF}/mo (bundle)`
  }
  return `Fansly + ManyVids: Fansly line + $${BUNDLE_ADDONS.MV_ON_FL}/mo (bundle)`
}
