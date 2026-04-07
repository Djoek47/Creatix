import type { PricingTier } from '@/lib/circe-venus-pricing'
import type { RevenueTierRow } from '@/lib/pricing-matrix'
import { percentVsOnlyFansBase } from '@/lib/pricing-matrix'
import { cn } from '@/lib/utils'

type BundleComboKey = 'of_fl' | 'of_mv' | 'fl_mv' | 'unified'

/** Bundle / Unified cell: price + savings vs buying each included solo line separately (from `circe-venus-pricing`). */
export function BundleMatrixCell({ tier, combo }: { tier: PricingTier; combo: BundleComboKey }) {
  const price = tier.prices[combo]
  const save = tier.savings[combo]
  const pct = tier.savingsPct[combo]
  const isUnified = combo === 'unified'
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={cn(
          'text-base font-semibold tabular-nums sm:text-lg',
          isUnified ? 'font-bold text-fuchsia-200' : 'text-foreground',
        )}
      >
        ${price}
      </span>
      <span
        className={cn(
          'text-[10px] font-medium leading-tight sm:text-xs',
          isUnified ? 'text-fuchsia-300/95' : 'text-emerald-400/95',
        )}
      >
        (−${save}, {pct}%)
      </span>
    </div>
  )
}

/** Solo platform column — plain USD (Focus line). */
export function SoloMatrixCell({ usd }: { usd: number }) {
  return <span className="text-base font-semibold tabular-nums text-foreground sm:text-lg">${usd}</span>
}

export function PriceWithSavings({ row, usd, baseline }: { row: RevenueTierRow; usd: number; baseline?: 'of' }) {
  const pct = percentVsOnlyFansBase(row, usd)
  const isBase = baseline === 'of' && usd === row.focusBaseUsd

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-base font-semibold tabular-nums text-foreground sm:text-lg">${usd}</span>
      <span
        className={cn(
          'text-[10px] font-medium leading-tight sm:text-xs',
          isBase && 'text-muted-foreground',
          !isBase && pct > 0 && 'text-emerald-400/95',
          !isBase && pct < 0 && 'text-amber-300/90',
        )}
      >
        {isBase ? 'OnlyFans base' : pct > 0 ? `−${pct}% vs OF` : pct < 0 ? `+${-pct}% vs OF base` : '—'}
      </span>
    </div>
  )
}
