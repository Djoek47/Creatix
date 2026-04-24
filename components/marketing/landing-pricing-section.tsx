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
import { Sparkles, Check } from 'lucide-react'
import {
  REVENUE_TIERS,
  getMonthlyPriceUsd,
  focusPlatformDisplayName,
  focusPlatformsShortLabel,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import {
  ADULT_BILLING_PLATFORMS,
  sortFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { PAID_TIER_FEATURES } from '@/lib/products'
import { includedCreditsForMarketing } from '@/lib/billing/credit-economics'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { cn } from '@/lib/utils'

const PLATFORM_BADGE: Record<AdultBillingPlatform, string> = {
  onlyfans: 'Base',
  fansly: '−10%',
  manyvids: '$39 flat',
}

type Props = {
  /** When true, no outer `<section id="pricing">` — parent supplies layout. */
  embedded?: boolean
}

export function LandingPricingSection({ embedded = false }: Props) {
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

  const includedPaidCredits = includedCreditsForMarketing(price, 1)

  const inner = (
    <div className="mx-auto max-w-4xl">
      {!embedded && (
        <div className="text-center">
          <PricingModelHeadline className="mx-auto max-w-4xl" />
        </div>
      )}

      <div className={cn(!embedded && 'mt-10', embedded && 'mt-0')}>
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-card p-6 sm:p-8">
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
            <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/90">
              <span className="font-medium text-primary">Paid:</span>{' '}
              {includedPaidCredits.toLocaleString()} AI credits / mo (20% of ${price} · $1 = 100 credits)
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {PAID_TIER_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
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
      </div>
    </div>
  )

  if (embedded) {
    return inner
  }

  return (
    <section id="pricing" className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
      {inner}
    </section>
  )
}
