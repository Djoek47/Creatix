import type { RevenueTierRow } from '@/lib/pricing-matrix'
import { percentVsOnlyFansBase } from '@/lib/pricing-matrix'
import { cn } from '@/lib/utils'

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
