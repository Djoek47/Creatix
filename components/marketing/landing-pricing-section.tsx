'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Star, Check } from 'lucide-react'
import {
  REVENUE_TIERS,
  getMonthlyPriceUsd,
  focusFanslyUsd,
  focusManyvidsUsd,
  focusPlatformDisplayName,
  focusPlatformsShortLabel,
  focusPriceUsd,
  twoPlatformFocusUsd,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import {
  ADULT_BILLING_PLATFORMS,
  sortFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { PAID_TIER_FEATURES } from '@/lib/products'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { cn } from '@/lib/utils'

const PLATFORM_BADGE: Record<AdultBillingPlatform, string> = {
  onlyfans: 'Base',
  fansly: '−10%',
  manyvids: '−25%',
}

export function LandingPricingSection() {
  const [tierIndex, setTierIndex] = useState(4)
  const [platformSelection, setPlatformSelection] = useState<Set<AdultBillingPlatform>>(
    () => new Set(['onlyfans']),
  )

  const sortedSelection = useMemo(
    () => sortFocusPlatforms([...platformSelection]),
    [platformSelection],
  )
  const isUnified = sortedSelection.length === 3
  const variant: BillingVariant = isUnified ? 'multi' : 'single'
  const price = getMonthlyPriceUsd(variant, tierIndex, isUnified ? undefined : sortedSelection)
  const selectedRow = REVENUE_TIERS.find((t) => t.tierIndex === tierIndex)

  const togglePlatform = (p: AdultBillingPlatform) => {
    setPlatformSelection((prev) => {
      const n = new Set(prev)
      if (n.has(p)) {
        if (n.size <= 1) return n
        n.delete(p)
        return n
      }
      n.add(p)
      return n
    })
  }

  const planSubtitle = isUnified
    ? 'Unified (all three)'
    : `Focus (${focusPlatformsShortLabel(sortedSelection)})`

  return (
    <section id="pricing" className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 gap-1 border-primary/40 text-primary">
            <Sparkles className="h-3 w-3" />
            14-day free trial
          </Badge>
          <PricingModelHeadline className="mx-auto max-w-4xl" />
          <div className="mx-auto mt-4 max-w-2xl">
            <PricingModelInlineBlurb className="text-center" />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
          <div className="flex-1 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-card p-6 sm:p-8">
            <p className="text-sm font-medium text-muted-foreground">Your plan</p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="landing-tier" className="text-foreground">
                  Monthly revenue band
                </Label>
                <Select value={String(tierIndex)} onValueChange={(v) => setTierIndex(Number.parseInt(v, 10))}>
                  <SelectTrigger id="landing-tier" className="w-full bg-background">
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
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Adult platforms</Label>
                <p className="text-xs text-muted-foreground">
                  Check 1–2 for Focus. Check all three for Unified pricing.
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
                      <span className="font-medium">{focusPlatformDisplayName(p)}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {PLATFORM_BADGE[p]}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-border/60 bg-background/50 p-6">
              <p className="text-sm text-muted-foreground">Estimated subscription</p>
              <p className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
                {selectedRow?.label}
                <span className="block text-base font-normal text-muted-foreground sm:inline sm:ml-2">
                  · {planSubtitle}
                </span>
              </p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-primary sm:text-6xl">${price}</span>
                <span className="text-muted-foreground">/month</span>
              </p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {PAID_TIER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Final price confirmed at checkout after sign-up. Taxes may apply.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/sign-up" className="flex-1">
                  <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground">
                    Start free trial <Sparkles className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing" className="flex-1">
                  <Button size="lg" variant="outline" className="w-full">
                    Full pricing page
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-muted/40 px-4 py-3">
              <h3 className="font-serif text-sm font-semibold text-foreground">All revenue tiers (USD/mo)</h3>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-border bg-card">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium">Tier</th>
                    <th className="px-2 py-3 text-right font-medium">OF</th>
                    <th className="px-2 py-3 text-right font-medium">FL</th>
                    <th className="px-2 py-3 text-right font-medium">MV</th>
                    <th className="px-2 py-3 text-right font-medium">×2</th>
                    <th className="px-3 py-3 text-right font-medium">Uni</th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE_TIERS.map((row) => {
                    const active = row.tierIndex === tierIndex
                    const ofP = focusPriceUsd(row, 'onlyfans')
                    const flP = focusFanslyUsd(row)
                    const mvP = focusManyvidsUsd(row)
                    const twoEx =
                      sortedSelection.length === 2
                        ? twoPlatformFocusUsd(row, sortedSelection[0], sortedSelection[1])
                        : twoPlatformFocusUsd(row, 'onlyfans', 'fansly')
                    const cellClass = (on: boolean) =>
                      cn(
                        'px-2 py-3 text-right tabular-nums',
                        active && on ? 'font-bold text-primary' : 'text-muted-foreground',
                      )
                    const singleHighlight = (p: AdultBillingPlatform) =>
                      !isUnified && active && sortedSelection.includes(p)
                    const twoHighlight = !isUnified && active && sortedSelection.length === 2
                    return (
                      <tr
                        key={row.tierIndex}
                        className={
                          active
                            ? 'bg-primary/15 ring-1 ring-inset ring-primary/30'
                            : 'border-b border-border/40 hover:bg-muted/30'
                        }
                      >
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setTierIndex(row.tierIndex)}
                            className="w-full text-left font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            {row.label}
                            {active && (
                              <Star className="ml-1 inline h-3.5 w-3.5 text-primary" aria-hidden />
                            )}
                          </button>
                        </td>
                        <td className={cellClass(singleHighlight('onlyfans'))}>${ofP}</td>
                        <td className={cellClass(singleHighlight('fansly'))}>${flP}</td>
                        <td className={cellClass(singleHighlight('manyvids'))}>${mvP}</td>
                        <td className={cellClass(twoHighlight)}>${twoEx}</td>
                        <td
                          className={cn(
                            'px-3 py-3 text-right tabular-nums',
                            active && isUnified ? 'font-bold text-primary' : 'text-muted-foreground',
                          )}
                        >
                          ${row.multiPriceUsd}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
