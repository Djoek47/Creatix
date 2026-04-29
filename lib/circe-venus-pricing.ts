/**
 * Circe et Venus — **single source of truth** for subscription USD amounts (USD/mo).
 * Checkout, Stripe alignment, billing UI, and marketing copy that needs real numbers must use this module
 * or `lib/pricing-matrix.ts` (facade). Do not duplicate tier math elsewhere.
 *
 * LOGIC RULES
 * -----------
 * - **OnlyFans, Fansly, Bundled (OF+FL):** list prices are defined per revenue band in `RAW_TIERS` (amended 2026 model).
 * - **Bundled** = one monthly price for OnlyFans + Fansly together (`of_fl`); this is also what `multi` / legacy `unified` bills.
 * - **Fansly** uses `flOverride` per band (not a single % of OF).
 * - **Anti‑piracy storefront connector** on Bundled OF+FL: `ADDON_UNIFIED` (flat; currently $24.99/mo). `of_mv` / `fl_mv` bundle list prices use separate add-ons
 *   when not overridden. **`mv` (ManyVids solo Focus)** is `MV_FLAT` (currently $25/mo). Separate **Protection** subscriptions ($25/mo) are distinct — see `cev-protection`.
 */

export type PlatformCombo =
  | 'of'
  | 'fl'
  | 'mv'
  | 'of_fl'
  | 'of_mv'
  | 'fl_mv'
  | 'unified'

export interface PricingTier {
  /** 0..10 — matches `subscriptions.revenue_tier` */
  tierIndex: number
  label: string
  revenueMin: number | null
  revenueMax: number | null
  prices: Record<PlatformCombo, number>
  savings: Record<'of_fl' | 'of_mv' | 'fl_mv' | 'unified', number>
  savingsPct: Record<'of_fl' | 'of_mv' | 'fl_mv' | 'unified', number>
}

const MV_FLAT = 25
const FL_CAP = 200
const FL_DISCOUNT = 0.9

const ADDON_FL = 20
const ADDON_MV_ON_OF = 15
const ADDON_MV_ON_FL = 8
/** ManyVids storefront connector on bundled OF+FL workspace (Anti‑piracy tier). */
const ADDON_UNIFIED = 24.99

function flPrice(of: number, override?: number): number {
  if (override !== undefined) return override
  return Math.min(Math.round(of * FL_DISCOUNT), FL_CAP)
}

function pct(savings: number, soloSum: number): number {
  return Math.round((savings / soloSum) * 100)
}

type BundleKey = 'of_fl' | 'of_mv' | 'fl_mv' | 'unified'

interface TierInput {
  label: string
  revenueMin: number | null
  revenueMax: number | null
  of: number
  flOverride?: number
  /** `of_fl` = Bundled (OnlyFans + Fansly). Optional legacy overrides for of_mv, fl_mv; `unified` defaults to `of_fl`. */
  bundleList?: Partial<Record<BundleKey, number>>
}

/** Amended matrix: OF | Fansly | Bundled; Bundled = `of_fl`. */
const RAW_TIERS: TierInput[] = [
  {
    label: 'Under $1k',
    revenueMin: null,
    revenueMax: 1000,
    of: 39,
    flOverride: 35,
    bundleList: { of_fl: 65 },
  },
  {
    label: '$1k – $5k',
    revenueMin: 1000,
    revenueMax: 5000,
    of: 55,
    flOverride: 45,
    bundleList: { of_fl: 85 },
  },
  { label: '$5k – $7.5k', revenueMin: 5000, revenueMax: 7500, of: 75, flOverride: 65, bundleList: { of_fl: 120 } },
  { label: '$7.5k – $10k', revenueMin: 7500, revenueMax: 10000, of: 100, flOverride: 85, bundleList: { of_fl: 160 } },
  {
    label: '$10k – $15k',
    revenueMin: 10000,
    revenueMax: 15000,
    of: 175,
    flOverride: 125,
    bundleList: { of_fl: 250 },
  },
  {
    label: '$15k – $25k',
    revenueMin: 15000,
    revenueMax: 25000,
    of: 225,
    flOverride: 150,
    bundleList: { of_fl: 335 },
  },
  {
    label: '$25k – $35k',
    revenueMin: 25000,
    revenueMax: 35000,
    of: 275,
    flOverride: 175,
    bundleList: { of_fl: 400 },
  },
  {
    label: '$35k – $45k',
    revenueMin: 35000,
    revenueMax: 45000,
    of: 300,
    flOverride: 200,
    bundleList: { of_fl: 450 },
  },
  {
    label: '$45k – $60k',
    revenueMin: 45000,
    revenueMax: 60000,
    of: 350,
    flOverride: 225,
    bundleList: { of_fl: 500 },
  },
  { label: '$60k – $80k', revenueMin: 60000, revenueMax: 80000, of: 425, flOverride: 250, bundleList: { of_fl: 600 } },
  { label: '$80k+', revenueMin: 80000, revenueMax: null, of: 500, flOverride: 300, bundleList: { of_fl: 650 } },
]

export const PRICING_TIERS: readonly PricingTier[] = RAW_TIERS.map((input, tierIndex) => {
  const { label, revenueMin, revenueMax, of, flOverride, bundleList } = input
  const fl = flPrice(of, flOverride)
  const mv = MV_FLAT
  const of_fl = bundleList?.of_fl ?? of + ADDON_FL
  const of_mv = bundleList?.of_mv ?? of + ADDON_MV_ON_OF
  const fl_mv = bundleList?.fl_mv ?? fl + ADDON_MV_ON_FL
  /** Legacy key; customer-facing "multi" / workspace bundle = Bundled (OF+FL), not OF+FL+MV. */
  const unified = bundleList?.unified ?? of_fl

  const soloOFFL = of + fl
  const soloOFMV = of + mv
  const soloFLMV = fl + mv
  const soloAll = of + fl + mv

  return {
    tierIndex,
    label,
    revenueMin,
    revenueMax,
    prices: { of, fl, mv, of_fl, of_mv, fl_mv, unified },
    savings: {
      of_fl: soloOFFL - of_fl,
      of_mv: soloOFMV - of_mv,
      fl_mv: soloFLMV - fl_mv,
      unified: soloAll - unified,
    },
    savingsPct: {
      of_fl: pct(soloOFFL - of_fl, soloOFFL),
      of_mv: pct(soloOFMV - of_mv, soloOFMV),
      fl_mv: pct(soloFLMV - fl_mv, soloFLMV),
      unified: pct(soloAll - unified, soloAll),
    },
  }
})

export const TIER_COUNT = PRICING_TIERS.length

export function getTierByRevenue(monthlyRevenue: number): PricingTier | null {
  return (
    PRICING_TIERS.find(({ revenueMin, revenueMax }) => {
      const aboveMin = revenueMin === null || monthlyRevenue >= revenueMin
      const belowMax = revenueMax === null || monthlyRevenue < revenueMax
      return aboveMin && belowMax
    }) ?? null
  )
}

export function tierIndexFromMonthlyRevenue(monthlyRevenueUsd: number): number {
  const x = Math.max(0, monthlyRevenueUsd)
  const tier = getTierByRevenue(x)
  return tier?.tierIndex ?? TIER_COUNT - 1
}

export function getPrice(monthlyRevenue: number, combo: PlatformCombo): number | null {
  const tier = getTierByRevenue(monthlyRevenue)
  return tier ? tier.prices[combo] : null
}

export const BUNDLE_ADDONS = {
  FL_ON_OF: ADDON_FL,
  MV_ON_OF: ADDON_MV_ON_OF,
  MV_ON_FL: ADDON_MV_ON_FL,
  UNIFIED_ON_OF: ADDON_UNIFIED,
  MV_FLAT,
  FL_CAP,
  FL_DISCOUNT,
} as const
