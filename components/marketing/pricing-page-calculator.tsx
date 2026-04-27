'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { Scale, Sparkles } from 'lucide-react'
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
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import {
  sortFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import {
  includedCreditsForMarketing,
  PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS,
} from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'

const FOCUS_PLATFORMS: AdultBillingPlatform[] = ['onlyfans', 'fansly']

/** Bundled plan chip + bundled platform tiles: shared violet / fuchsia / amber + gold–purple glow */
const bundledGlowSurface = cn(
  'relative isolate border-fuchsia-400/75 !bg-gradient-to-r !from-fuchsia-600/28 !via-violet-600/22 !to-amber-400/18 text-foreground shadow-none',
  'motion-safe:animate-[divine-briefing-gold-purple-glow_3.2s_ease-in-out_infinite]',
  'motion-reduce:animate-none motion-reduce:shadow-[0_0_20px_-6px_rgba(168,85,247,0.55),0_0_32px_-10px_rgba(251,191,36,0.35)]',
)

const OTHER_PLATFORM_BUNDLE_ADDON_USD = 25
const MULTIPLATFORM_LOGOS = [
  '/mym-logo.png',
  '/clips4sale-logo.png',
  '/fanvue-logo.png',
  '/loyalfans-logo.svg',
] as const

export type PricingPageCalculatorProps = {
  /**
   * `landing` — home / embedded pricing card: same controls + protection bundle as the full page,
   * with compact chrome and a link to `/pricing` instead of in-app billing.
   */
  surface?: 'default' | 'landing'
  className?: string
}

export function PricingPageCalculator({ surface = 'default', className }: PricingPageCalculatorProps = {}) {
  const [revenueInput, setRevenueInput] = useState('5000')
  /** When true, band comes from estimated revenue input; when false, from the band dropdown. */
  const [useRevenueForBand, setUseRevenueForBand] = useState(false)
  const [tierIndex, setTierIndex] = useState(2)
  const [isAutoCyclingBand, setIsAutoCyclingBand] = useState(true)
  const [autoPreviewPhase, setAutoPreviewPhase] = useState<'gold' | 'purple'>('gold')
  const [otherPlatformBundleEnabled, setOtherPlatformBundleEnabled] = useState(false)
  const [protectionOnly, setProtectionOnly] = useState(false)
  const [multiLogoPhase, setMultiLogoPhase] = useState<'single' | 'all'>('single')
  const [multiLogoIndex, setMultiLogoIndex] = useState(0)
  const [variant, setVariant] = useState<BillingVariant>('single')
  const [platformSelection, setPlatformSelection] = useState<Set<AdultBillingPlatform>>(
    () => new Set<AdultBillingPlatform>(['onlyfans', 'fansly']),
  )
  const [planGlow, setPlanGlow] = useState<'focus' | 'bundled' | null>(null)
  const planGlowTimer = useRef<number | null>(null)

  const derivedTier = useMemo(() => {
    const n = Number.parseFloat(revenueInput.replace(/,/g, ''))
    const revenue = Number.isFinite(n) && n >= 0 ? n : 0
    return tierIndexFromMonthlyRevenue(revenue)
  }, [revenueInput])

  const suggestedRow = useMemo(() => getTierByIndex(derivedTier), [derivedTier])
  const effectiveTier = useRevenueForBand ? derivedTier : tierIndex
  const tierRow = getTierByIndex(effectiveTier)

  const effectiveVariant: BillingVariant = variant

  const sortedPlatforms = useMemo(() => {
    if (variant === 'multi') return sortFocusPlatforms(['onlyfans', 'fansly'])
    return sortFocusPlatforms([...platformSelection])
  }, [variant, platformSelection])

  const focusBothApiPlatforms =
    variant === 'single' &&
    platformSelection.size === 2 &&
    platformSelection.has('onlyfans') &&
    platformSelection.has('fansly')

  const prevFocusPlatformCount = useRef<number | null>(null)

  const focusListForPrice: AdultBillingPlatform[] | undefined =
    effectiveVariant === 'multi' ? undefined : sortedPlatforms.length ? sortedPlatforms : ['onlyfans']

  const baseMonthlyUsd = tierRow
    ? getMonthlyPriceUsd(effectiveVariant, effectiveTier, focusListForPrice)
    : 0
  const monthlyUsd = protectionOnly
    ? OTHER_PLATFORM_BUNDLE_ADDON_USD
    : baseMonthlyUsd + (otherPlatformBundleEnabled ? OTHER_PLATFORM_BUNDLE_ADDON_USD : 0)

  const paidCredits = protectionOnly
    ? PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS
    : includedCreditsForMarketing(monthlyUsd, 1)

  const pctVsOf = protectionOnly ? 0 : tierRow ? percentVsOnlyFansBase(tierRow, monthlyUsd) : 0

  const lockBandPreview = () => setIsAutoCyclingBand(false)
  const triggerPlanGlow = (nextGlow: 'focus' | 'bundled', durationMs: number) => {
    if (planGlowTimer.current) {
      window.clearTimeout(planGlowTimer.current)
      planGlowTimer.current = null
    }
    setPlanGlow(nextGlow)
    planGlowTimer.current = window.setTimeout(() => setPlanGlow(null), durationMs)
  }

  useEffect(() => {
    const count = platformSelection.size
    const prev = prevFocusPlatformCount.current
    prevFocusPlatformCount.current = count

    if (variant !== 'single') {
      if (planGlowTimer.current) {
        window.clearTimeout(planGlowTimer.current)
        planGlowTimer.current = null
      }
      setPlanGlow(null)
      return
    }

    if (prev === null) return

    let nextGlow: 'focus' | 'bundled' | null = null
    if (prev === 1 && count === 2) nextGlow = 'bundled'
    else if (prev === 2 && count === 1) nextGlow = 'focus'

    if (!nextGlow) return

    triggerPlanGlow(nextGlow, nextGlow === 'bundled' ? 5200 : 900)

    return () => {
      if (planGlowTimer.current) window.clearTimeout(planGlowTimer.current)
    }
  }, [variant, platformSelection])

  useEffect(() => {
    if (!isAutoCyclingBand || useRevenueForBand) return
    const timer = window.setInterval(() => {
      setTierIndex((prev) => {
        const idx = REVENUE_TIERS.findIndex((t) => t.tierIndex === prev)
        const next = REVENUE_TIERS[(idx + 1 + REVENUE_TIERS.length) % REVENUE_TIERS.length]
        return next?.tierIndex ?? prev
      })
      setAutoPreviewPhase((prev) => (prev === 'gold' ? 'purple' : 'gold'))
    }, 3800)
    return () => window.clearInterval(timer)
  }, [isAutoCyclingBand, useRevenueForBand])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMultiLogoPhase((phase) => {
        if (phase === 'single') {
          setMultiLogoIndex((idx) => {
            if (idx < MULTIPLATFORM_LOGOS.length - 1) return idx + 1
            return idx
          })
          return multiLogoIndex >= MULTIPLATFORM_LOGOS.length - 1 ? 'all' : 'single'
        }
        setMultiLogoIndex(0)
        return 'single'
      })
    }, 2300)
    return () => window.clearInterval(timer)
  }, [multiLogoIndex])

  const togglePlatform = (p: AdultBillingPlatform) => {
    lockBandPreview()
    if (variant === 'single') {
      setPlatformSelection((prev) => {
        const next = new Set(prev)
        if (next.has(p)) {
          if (next.size <= 1) return next
          next.delete(p)
        } else {
          if (next.size >= 2) return next
          next.add(p)
        }
        return next
      })
    }
  }

  const breakdown = useMemo(() => {
    if (protectionOnly) {
      return {
        lines: [{ label: 'Multiplatform protection', usd: OTHER_PLATFORM_BUNDLE_ADDON_USD }],
        note: 'Standalone plan for non-API platform protection coverage.',
      }
    }
    if (!tierRow) return null
    if (effectiveVariant === 'multi') {
      return {
        lines: [{ label: 'Bundled (OnlyFans + Fansly)', usd: tierRow.multiPriceUsd }],
        note: 'One monthly price for both platforms. ManyVids, Clips4Sale, and other non-API sites: add Protection $25/mo in Settings.',
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
  }, [tierRow, effectiveVariant, sortedPlatforms, effectiveTier, protectionOnly])

  const Root = surface === 'landing' ? 'div' : 'section'
  const rootClass = cn(
    surface === 'landing'
      ? 'mx-auto w-full max-w-4xl rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-card p-6 sm:p-8'
      : 'mx-auto max-w-6xl rounded-3xl border border-primary/25 bg-card/50 p-6 shadow-xl backdrop-blur-md sm:p-8',
    className,
  )

  return (
    <Root
      className={rootClass}
      {...(surface === 'landing'
        ? { role: 'region', 'aria-label': 'Pricing estimate' }
        : { 'aria-labelledby': 'pricing-calculator-heading' })}
    >
      {surface === 'landing' ? (
        <p className="text-sm font-medium text-muted-foreground">Your plan</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
              <Scale className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 id="pricing-calculator-heading" className="font-serif text-xl font-semibold sm:text-2xl">
                Pricing
              </h2>
              <p className="text-sm text-muted-foreground">
                Same math as checkout: pick your band, Focus or Bundled (OnlyFans + Fansly), and platforms.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={cn('grid gap-8 lg:grid-cols-2', surface === 'landing' ? 'mt-6' : 'mt-8')}>
        <div className="space-y-6">
          {!useRevenueForBand && (
            <div className="space-y-2">
              <Label htmlFor="pricing-tier-select">Revenue band</Label>
              <Select
                value={String(tierIndex)}
                onValueChange={(v) => {
                  lockBandPreview()
                  setTierIndex(Number.parseInt(v, 10))
                }}
              >
                <SelectTrigger
                  id="pricing-tier-select"
                  className={cn(
                    'transition-all duration-700',
                    isAutoCyclingBand &&
                      (autoPreviewPhase === 'gold'
                        ? 'border-amber-400/60 shadow-[0_0_0_1px_rgba(251,191,36,0.3),0_0_22px_-10px_rgba(251,191,36,0.7)]'
                        : 'border-fuchsia-400/55 shadow-[0_0_0_1px_rgba(217,70,239,0.25),0_0_22px_-10px_rgba(168,85,247,0.65)]'),
                  )}
                >
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
              className="shadow-[0_0_0_1px_rgba(168,85,247,0.42),0_0_10px_-3px_rgba(168,85,247,0.5),0_0_14px_-6px_rgba(251,191,36,0.42)]"
              onCheckedChange={(v) => {
                lockBandPreview()
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
                onChange={(e) => {
                  lockBandPreview()
                  setRevenueInput(e.target.value)
                }}
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
                variant={effectiveVariant === 'single' && !focusBothApiPlatforms ? 'default' : 'outline'}
                className={cn(
                  effectiveVariant === 'single' && !focusBothApiPlatforms && 'hover:text-primary-foreground',
                  (effectiveVariant !== 'single' || focusBothApiPlatforms) &&
                    'text-foreground hover:bg-muted/50 hover:text-foreground dark:hover:bg-muted/45',
                  effectiveVariant === 'single' &&
                    focusBothApiPlatforms &&
                    'border-border/80 bg-muted/40 shadow-none hover:bg-muted/55',
                  planGlow === 'focus' &&
                    'ring-2 ring-amber-400/45 ring-offset-2 ring-offset-background shadow-[0_0_18px_-8px_rgba(251,191,36,0.55)] animate-pulse',
                )}
                onClick={() => {
                  lockBandPreview()
                  setProtectionOnly(false)
                  if (effectiveVariant === 'multi') {
                    const randomPlatform: AdultBillingPlatform =
                      Math.random() < 0.5 ? 'onlyfans' : 'fansly'
                    setPlatformSelection(new Set([randomPlatform]))
                    setVariant('single')
                    triggerPlanGlow('focus', 1600)
                    return
                  }
                  setVariant('single')
                  triggerPlanGlow('focus', 1200)
                }}
              >
                Focus
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  'transition-[box-shadow,border-color,background-color,color,transform] duration-300',
                  effectiveVariant === 'multi' &&
                    cn(
                      bundledGlowSurface,
                      'hover:border-fuchsia-300/85 hover:!from-fuchsia-600/34 hover:!via-violet-600/28 hover:!to-amber-400/24 hover:text-foreground',
                    ),
                  effectiveVariant === 'multi' &&
                    'focus-visible:border-fuchsia-400/80 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  effectiveVariant !== 'multi' &&
                    'text-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring/50 dark:hover:bg-muted/45',
                  planGlow === 'bundled' &&
                    'z-[1] scale-[1.02] ring-2 ring-amber-300/70 ring-offset-2 ring-offset-background motion-safe:animate-pulse',
                )}
                onClick={() => {
                  lockBandPreview()
                  setProtectionOnly(false)
                  setVariant('multi')
                  setPlatformSelection(new Set(['onlyfans', 'fansly']))
                }}
              >
                Bundled (OnlyFans + Fansly)
              </Button>
            </div>
          </div>

          {!protectionOnly && (effectiveVariant === 'single' || effectiveVariant === 'multi') ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">Platforms</span>
              <p className="text-xs text-muted-foreground">
                {effectiveVariant === 'single'
                  ? 'Pick one or two for Focus pricing.'
                  : 'Bundled includes OnlyFans and Fansly together — both highlighted below.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {FOCUS_PLATFORMS.map((p) => {
                  const selected = platformSelection.has(p)
                  const bundledRow = effectiveVariant === 'multi'
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        if (bundledRow) {
                          lockBandPreview()
                          setProtectionOnly(false)
                          setVariant('single')
                          setPlatformSelection(new Set([p]))
                          return
                        }
                        togglePlatform(p)
                      }}
                      className={cn(
                        'group flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-[box-shadow,border-color,background-color,color,transform]',
                        bundledRow && cn(bundledGlowSurface, 'cursor-pointer'),
                        !bundledRow &&
                          focusBothApiPlatforms &&
                          selected &&
                          cn(bundledGlowSurface, 'hover:border-fuchsia-300/85'),
                        !bundledRow &&
                          p === 'onlyfans' &&
                          !focusBothApiPlatforms &&
                          selected &&
                          'border-sky-500/50 bg-sky-500/12 shadow-[0_0_0_1px_rgba(14,165,233,0.2)]',
                        !bundledRow &&
                          p === 'fansly' &&
                          !focusBothApiPlatforms &&
                          selected &&
                          'border-blue-500/50 bg-blue-500/12 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]',
                        !bundledRow && !selected && 'border-border bg-background/80 hover:bg-muted/40',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-8 min-w-[3.5rem] max-w-[4.5rem] items-center justify-center overflow-hidden rounded-lg border bg-card/90 px-0.5 transition-all',
                          bundledRow && 'border-fuchsia-400/45 bg-black/25',
                          !bundledRow && selected && 'border-primary/45 group-hover:scale-105',
                          !bundledRow && !selected && 'border-border/60',
                        )}
                      >
                        {p === 'onlyfans' ? (
                          <Image
                            src={ONLYFANS_LOGO_SRC}
                            alt="OnlyFans"
                            width={88}
                            height={20}
                            className={cn(
                              'h-5 w-auto max-w-full object-contain object-left transition-all',
                              selected || bundledRow ? 'grayscale-0' : 'grayscale contrast-125 brightness-110 opacity-80',
                            )}
                          />
                        ) : p === 'fansly' ? (
                          <Image
                            src={FANSLY_LOGO_SRC}
                            alt="Fansly"
                            width={76}
                            height={20}
                            className={cn(
                              'h-5 w-auto max-w-full object-contain object-left transition-all',
                              selected || bundledRow ? 'grayscale-0' : 'grayscale contrast-125 brightness-110 opacity-80',
                            )}
                          />
                        ) : null}
                      </span>
                      <span className="font-medium">{focusPlatformDisplayName(p)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

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
              <div className="mt-3 text-muted-foreground">
                <p className="text-sm leading-relaxed">
                  <span className="font-medium text-foreground">Paid AI credits:</span>{' '}
                  {paidCredits.toLocaleString()}/mo, with access to all tools.
                </p>
              </div>
            )}
            {tierRow && !protectionOnly && (
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
                {breakdown.lines.map((row) => {
                  const isProtectionLine = row.label === 'Multiplatform protection'
                  return (
                    <li
                      key={row.label}
                      className={cn(
                        'flex justify-between gap-4 tabular-nums',
                        isProtectionLine &&
                          cn(
                            'rounded-lg border border-fuchsia-500/25 bg-gradient-to-r from-amber-400/12 via-fuchsia-500/12 to-violet-600/12 bg-[length:200%_200%] px-3 py-2 animate-gradient-x',
                            useRevenueForBand
                              ? 'shadow-[0_0_22px_-8px_rgba(251,191,36,0.45),0_0_26px_-8px_rgba(168,85,247,0.55)]'
                              : 'shadow-[0_0_18px_-8px_rgba(251,191,36,0.35),0_0_20px_-8px_rgba(168,85,247,0.45)]',
                          ),
                      )}
                    >
                      <span className={cn('text-muted-foreground', isProtectionLine && 'font-medium text-foreground')}>
                        {row.label}
                      </span>
                      <span>${row.usd}</span>
                    </li>
                  )
                })}
                {otherPlatformBundleEnabled && !protectionOnly ? (
                  <li
                    className={cn(
                      'flex justify-between gap-4 tabular-nums rounded-lg border border-fuchsia-500/25 bg-gradient-to-r from-amber-400/12 via-fuchsia-500/12 to-violet-600/12 bg-[length:200%_200%] px-3 py-2 animate-gradient-x',
                      useRevenueForBand
                        ? 'shadow-[0_0_22px_-8px_rgba(251,191,36,0.45),0_0_26px_-8px_rgba(168,85,247,0.55)]'
                        : 'shadow-[0_0_18px_-8px_rgba(251,191,36,0.35),0_0_20px_-8px_rgba(168,85,247,0.45)]',
                    )}
                  >
                    <span className="font-medium text-foreground">Multiplatform protection</span>
                    <span>+${OTHER_PLATFORM_BUNDLE_ADDON_USD}</span>
                  </li>
                ) : null}
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
              <Link href={surface === 'landing' ? '/pricing' : '/dashboard/settings?tab=billing'}>
                {surface === 'landing' ? 'Full pricing page' : 'Billing in app'}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mx-auto mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-5 sm:p-6',
          surface === 'default' && 'max-w-4xl',
        )}
      >
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 rounded-lg border border-amber-500/35 bg-amber-500/20 p-2.5">
            {multiLogoPhase === 'all' ? (
              <div className="grid h-full w-full grid-cols-2 gap-1 transition-all duration-500">
                {MULTIPLATFORM_LOGOS.map((src) => (
                  <span
                    key={src}
                    className="inline-flex h-4.5 w-4.5 items-center justify-center overflow-hidden rounded-sm bg-card/90"
                  >
                    <Image src={src} alt="" width={18} height={18} className="h-4.5 w-4.5 object-cover" />
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center transition-all duration-500">
                <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-sm bg-card/90">
                  <Image
                    src={MULTIPLATFORM_LOGOS[multiLogoIndex]}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-cover"
                  />
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">Multiplatform protection</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Non-API platform protection at $25/mo. Use it standalone or stack it with your current plan.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={otherPlatformBundleEnabled && !protectionOnly ? 'default' : 'outline'}
                className="border-amber-500/35"
                onClick={() => {
                  lockBandPreview()
                  setProtectionOnly(false)
                  setOtherPlatformBundleEnabled((v) => !v)
                }}
              >
                {otherPlatformBundleEnabled && !protectionOnly
                  ? 'Added to plan (+$25/mo)'
                  : 'Add to current plan (+$25/mo)'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={protectionOnly ? 'default' : 'outline'}
                className={cn(
                  'border-fuchsia-500/40 transition-all duration-300',
                  protectionOnly
                    ? 'border-amber-400/45 bg-gradient-to-r from-amber-400/35 via-primary/30 to-fuchsia-400/35 bg-[length:200%_200%] text-foreground shadow-[0_0_22px_-6px_rgba(251,191,36,0.75),0_0_28px_-8px_rgba(168,85,247,0.7),0_0_14px_-4px_rgba(192,38,211,0.45)] animate-gradient-x'
                    : 'shadow-[0_0_20px_-8px_rgba(168,85,247,0.5),0_0_10px_-4px_rgba(147,51,234,0.35)] hover:border-fuchsia-400/50 hover:shadow-[0_0_24px_-8px_rgba(168,85,247,0.6),0_0_14px_-6px_rgba(251,191,36,0.25)] hover:bg-gradient-to-r hover:from-amber-400/12 hover:via-fuchsia-500/14 hover:to-violet-600/12 hover:bg-[length:200%_200%] hover:animate-gradient-x',
                )}
                onClick={() => {
                  lockBandPreview()
                  setOtherPlatformBundleEnabled(false)
                  setProtectionOnly((v) => !v)
                }}
              >
                {protectionOnly ? 'Protection-only selected ($25/mo)' : 'Choose protection only ($25/mo)'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Root>
  )
}
