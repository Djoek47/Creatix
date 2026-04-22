/**
 * Circe et Venus — **single source of truth** for subscription USD amounts (USD/mo).
 * Checkout, Stripe alignment, billing UI, and marketing copy that needs real numbers must use this module
 * or `lib/pricing-matrix.ts` (facade). Do not duplicate tier math elsewhere.
 *
 * LOGIC RULES
 * -----------
 * - OF     : base price, scales by revenue tier (`RAW_TIERS`)
 * - FL     : OF × 0.9, capped at $200 (`flOverride` on top tier)
 * - MV     : flat $39 (ManyVids)
 * - OF+FL  : OF + $20
 * - OF+MV  : OF + $15
 * - FL+MV  : FL + $8
 * - Unified: OF + $25 (all three; cheaper than buying each line solo)
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

const MV_FLAT = 39
const FL_CAP = 200
const FL_DISCOUNT = 0.9

const ADDON_FL = 20
const ADDON_MV_ON_OF = 15
const ADDON_MV_ON_FL = 8
const ADDON_UNIFIED = 25

function flPrice(of: number, override?: number): number {
  if (override !== undefined) return override
  return Math.min(Math.round(of * FL_DISCOUNT), FL_CAP)
}

function pct(savings: number, soloSum: number): number {
  return Math.round((savings / soloSum) * 100)
}

interface TierInput {
  label: string
  revenueMin: number | null
  revenueMax: number | null
  of: number
  flOverride?: number
}

const RAW_TIERS: TierInput[] = [
  { label: 'Under $1k', revenueMin: null, revenueMax: 1000, of: 39 },
  { label: '$1k – $5k', revenueMin: 1000, revenueMax: 5000, of: 50 },
  { label: '$5k – $7.5k', revenueMin: 5000, revenueMax: 7500, of: 75 },
  { label: '$7.5k – $10k', revenueMin: 7500, revenueMax: 10000, of: 100 },
  { label: '$10k – $15k', revenueMin: 10000, revenueMax: 15000, of: 125 },
  { label: '$15k – $25k', revenueMin: 15000, revenueMax: 25000, of: 175 },
  { label: '$25k – $35k', revenueMin: 25000, revenueMax: 35000, of: 225 },
  { label: '$35k – $45k', revenueMin: 35000, revenueMax: 45000, of: 275 },
  { label: '$45k – $60k', revenueMin: 45000, revenueMax: 60000, of: 350 },
  { label: '$60k – $80k', revenueMin: 60000, revenueMax: 80000, of: 425 },
  { label: '$80k+', revenueMin: 80000, revenueMax: null, of: 500, flOverride: 200 },
]

export const PRICING_TIERS: readonly PricingTier[] = RAW_TIERS.map((input, tierIndex) => {
  const { label, revenueMin, revenueMax, of, flOverride } = input
  const fl = flPrice(of, flOverride)
  const mv = MV_FLAT
  const of_fl = of + ADDON_FL
  const of_mv = of + ADDON_MV_ON_OF
  const fl_mv = fl + ADDON_MV_ON_FL
  const unified = of + ADDON_UNIFIED

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
