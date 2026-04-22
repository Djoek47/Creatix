'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calculator, Sparkles } from 'lucide-react'
import {
  REVENUE_TIERS,
  getMonthlyPriceUsd,
  getTierByIndex,
  tierIndexFromMonthlyRevenue,
  focusPlatformDisplayName,
  focusPlatformsShortLabel,
  pairBundleDescription,
  percentVsOnlyFansBase,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import {
  ADULT_BILLING_PLATFORMS,
  sortFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { includedCreditsForMarketing } from '@/lib/billing/credit-economics'
import { CREDIT_ALLOWANCE_MARKETING_LINE } from '@/lib/marketing/pricing-copy'
import { cn } from '@/lib/utils'

export function PricingPageCalculator() {
  const [revenueInput, setRevenueInput] = useState('5000')
  /** When true, band comes from estimated revenue input; when false, from the band dropdown. */
  const [useRevenueForBand, setUseRevenueForBand] = useState(false)
  const [tierIndex, setTierIndex] = useState(2)
  const [variant, setVariant] = useState<BillingVariant>('single')
  const [platformSelection, setPlatformSelection] = useState<Set<AdultBillingPlatform>>(
    () => new Set<AdultBillingPlatform>(['onlyfans', 'fansly']),
  )

  const derivedTier = useMemo(() => {
    const n = Number.parseFloat(revenueInput.replace(/,/g, ''))
    const revenue = Number.isFinite(n) && n >= 0 ? n : 0
    return tierIndexFromMonthlyRevenue(revenue)
  }, [revenueInput])

  const suggestedRow = useMemo(() => getTierByIndex(derivedTier), [derivedTier])
  const effectiveTier = useRevenueForBand ? derivedTier : tierIndex
  const tierRow = getTierByIndex(effectiveTier)

  const sortedPlatforms = useMemo(
    () => sortFocusPlatforms([...platformSelection]),
    [platformSelection],
  )

  const effectiveVariant: BillingVariant =
    sortedPlatforms.length >= 3 ? 'multi' : variant === 'multi' ? 'multi' : 'single'

  const focusListForPrice: AdultBillingPlatform[] | undefined =
    effectiveVariant === 'multi' ? undefined : sortedPlatforms.length ? sortedPlatforms : ['onlyfans']

  const monthlyUsd = tierRow
    ? getMonthlyPriceUsd(effectiveVariant, effectiveTier, focusListForPrice)
    : 0

  const paidCredits = includedCreditsForMarketing(monthlyUsd, 1)

  const pctVsOf = tierRow ? percentVsOnlyFansBase(tierRow, monthlyUsd) : 0

  const togglePlatform = (p: AdultBillingPlatform) => {
    setPlatformSelection((prev) => {
      const next = new Set(prev)
      if (next.has(p)) {
        if (next.size <= 1) return next
        next.delete(p)
      } else {
        next.add(p)
      }
      return next
    })
  }

  const breakdown = useMemo(() => {
    if (!tierRow) return null
    if (effectiveVariant === 'multi') {
      return {
        lines: [{ label: 'Unified (all three platforms)', usd: tierRow.multiPriceUsd }],
        note: 'Single workspace price for OnlyFans, Fansly, and ManyVids',
      }
    }
    if (sortedPlatforms.length === 1) {
      const p = sortedPlatforms[0]
      return {
        lines: [
          {
            label: focusPlatformDisplayName(p),
            usd: getMonthlyPriceUsd('single', effectiveTier, [p]),
          },
        ],
        note: 'Single-platform Focus',
      }
    }
    if (sortedPlatforms.length === 2) {
      const [a, b] = sortedPlatforms
      const bundleUsd = getMonthlyPriceUsd('single', effectiveTier, [a, b])
      return {
        lines: [
          {
            label: `Focus bundle (${focusPlatformsShortLabel([a, b])})`,
            usd: bundleUsd,
          },
        ],
        note: pairBundleDescription(a, b),
      }
    }
    return null
  }, [tierRow, effectiveVariant, sortedPlatforms, effectiveTier])

  return (
    <section
      className="mx-auto max-w-6xl rounded-3xl border border-primary/25 bg-card/50 p-6 shadow-xl backdrop-blur-md sm:p-8"
      aria-labelledby="pricing-calculator-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
            <Calculator className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h2 id="pricing-calculator-heading" className="font-serif text-xl font-semibold sm:text-2xl">
              Pricing calculator
            </h2>
            <p className="text-sm text-muted-foreground">
              Same math as checkout: pick your band, Focus or Unified, and platforms.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {!useRevenueForBand && (
            <div className="space-y-2">
              <Label htmlFor="pricing-tier-select">Revenue band</Label>
              <Select
                value={String(tierIndex)}
                onValueChange={(v) => setTierIndex(Number.parseInt(v, 10))}
              >
                <SelectTrigger id="pricing-tier-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_TIERS.map((t) => (
                    <SelectItem key={t.tierIndex} value={String(t.tierIndex)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Same revenue bands as checkout. Pick the band that matches how you bill.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              id="pricing-revenue-override"
              checked={useRevenueForBand}
              onCheckedChange={(v) => {
                const on = v === true
                setUseRevenueForBand(on)
                if (!on) {
                  setTierIndex(derivedTier)
                }
              }}
            />
            <Label htmlFor="pricing-revenue-override" className="cursor-pointer text-sm font-normal">
              Use estimated monthly revenue instead
            </Label>
          </div>

          {useRevenueForBand && (
            <div className="space-y-2">
              <Label htmlFor="pricing-revenue">Estimated gross monthly revenue (USD)</Label>
              <Input
                id="pricing-revenue"
                inputMode="decimal"
                autoComplete="off"
                placeholder="e.g. 5000"
                value={revenueInput}
                onChange={(e) => setRevenueInput(e.target.value)}
                aria-describedby="pricing-revenue-hint"
              />
              <p id="pricing-revenue-hint" className="text-xs text-muted-foreground">
                We map this to a band the same way billing does ({suggestedRow?.label ?? '—'}).
              </p>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium">Plan type</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={effectiveVariant === 'single' && sortedPlatforms.length < 3 ? 'default' : 'outline'}
                onClick={() => {
                  setVariant('single')
                  if (platformSelection.size >= 3) {
                    const keep = sortFocusPlatforms([...platformSelection]).slice(0, 2)
                    setPlatformSelection(new Set(keep))
                  }
                }}
              >
                Focus (1–2 platforms)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={effectiveVariant === 'multi' ? 'default' : 'outline'}
                onClick={() => {
                  setVariant('multi')
                  setPlatformSelection(new Set(ADULT_BILLING_PLATFORMS))
                }}
              >
                Unified (all three)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Platforms</span>
            <p className="text-xs text-muted-foreground">
              Select 1–2 for Focus, or use Unified above for all three.
            </p>
            <div className="flex flex-wrap gap-3">
              {ADULT_BILLING_PLATFORMS.map((p) => (
                <label
                  key={p}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    platformSelection.has(p)
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-background/80 hover:bg-muted/40',
                  )}
                >
                  <Checkbox
                    checked={platformSelection.has(p)}
                    onCheckedChange={() => togglePlatform(p)}
                    aria-label={focusPlatformDisplayName(p)}
                  />
                  <span>{focusPlatformDisplayName(p)}</span>
                </label>
              ))}
            </div>
            {sortedPlatforms.length >= 3 && (
              <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
                All three platforms selected — estimate uses Unified pricing for this band.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-background/60 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Estimated monthly
            </p>
            <p className="mt-2 font-serif text-4xl font-bold tabular-nums text-primary sm:text-5xl">
              ${monthlyUsd}
              <span className="text-lg font-normal text-muted-foreground sm:text-xl">/mo</span>
            </p>
            {monthlyUsd > 0 && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Paid AI credits (1 seat):</span>{' '}
                {paidCredits.toLocaleString()}/mo — {CREDIT_ALLOWANCE_MARKETING_LINE}
              </p>
            )}
            {tierRow && (
              <p
                className={cn(
                  'mt-2 text-sm font-medium',
                  pctVsOf > 0 && 'text-emerald-600 dark:text-emerald-400',
                  pctVsOf < 0 && 'text-amber-700 dark:text-amber-400',
                  pctVsOf === 0 && 'text-muted-foreground',
                )}
              >
                {pctVsOf > 0 && `−${pctVsOf}% vs OnlyFans base in this band`}
                {pctVsOf < 0 && `+${-pctVsOf}% vs OnlyFans base in this band`}
                {pctVsOf === 0 && 'Same as OnlyFans base in this band'}
              </p>
            )}

            {breakdown && breakdown.lines.length > 0 && (
              <ul className="mt-6 space-y-2 border-t border-border/60 pt-4 text-sm">
                {breakdown.lines.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4 tabular-nums">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span>${row.usd}</span>
                  </li>
                ))}
                <li className="pt-2 text-xs text-muted-foreground">{breakdown.note}</li>
              </ul>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link href="/auth/sign-up">
                <Sparkles className="h-4 w-4" />
                Start free trial
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings?tab=billing">Billing in app</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
