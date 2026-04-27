'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
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
import { Sparkles } from 'lucide-react'
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

const OTHER_PLATFORM_BUNDLE_ADDON_USD = 25
const MULTIPLATFORM_LOGOS = [
  '/mym-logo.png',
  '/clips4sale-logo.png',
  '/fanvue-logo.png',
  '/loyalfans-logo.svg',
] as const

export type PricingCalculatorControlledProps = {
  tierIndex: number
  onTierIndexChange: (v: number) => void
  variant: BillingVariant
  onVariantChange: (v: BillingVariant) => void
  platformSelection: Set<AdultBillingPlatform>
  togglePlatform: (p: AdultBillingPlatform) => void
  setPlatformSelection: (next: Set<AdultBillingPlatform>) => void
}

export type PricingPageCalculatorProps = {
  /**
   * `landing` — home: compact chrome, link to `/pricing`.
   * `settings` — billing: synced to checkout state; no marketing CTAs or duplicate protection upsell.
   */
  surface?: 'default' | 'landing' | 'settings'
  className?: string
  /** Billing: single source of truth with parent state. */
  controlled?: PricingCalculatorControlledProps
}

export function PricingPageCalculator({
  surface = 'default',
  className,
  controlled,
}: PricingPageCalculatorProps = {}) {
  const isControlled = controlled != null
  const reduceMotion = useReducedMotion()

  const [revenueInput, setRevenueInput] = useState('5000')
  const [useRevenueForBand, setUseRevenueForBand] = useState(false)
  const [tierIndexInternal, setTierIndexInternal] = useState(2)
  const [bandCyclePaused, setBandCyclePaused] = useState(false)
  const [planGlowPulse, setPlanGlowPulse] = useState(false)
  /** Multiplatform logo grid: `'all'` = four small together; `0..3` = spotlight one tile at a time (no overlap pop). */
  const [multiLogoSpotlight, setMultiLogoSpotlight] = useState<'all' | number>('all')
  const planGlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [otherPlatformBundleEnabled, setOtherPlatformBundleEnabled] = useState(false)
  const [protectionOnly, setProtectionOnly] = useState(false)
  const [variantInternal, setVariantInternal] = useState<BillingVariant>('single')
  const [platformSelectionInternal, setPlatformSelectionInternal] = useState<Set<AdultBillingPlatform>>(
    () => new Set<AdultBillingPlatform>(['onlyfans', 'fansly']),
  )

  const tierIndex = isControlled ? controlled.tierIndex : tierIndexInternal
  const setTierIndex = (v: number) =>
    isControlled ? controlled.onTierIndexChange(v) : setTierIndexInternal(v)

  const variant = isControlled ? controlled.variant : variantInternal
  const setVariant = (v: BillingVariant) =>
    isControlled ? controlled.onVariantChange(v) : setVariantInternal(v)

  const platformSelection = isControlled ? controlled.platformSelection : platformSelectionInternal
  const togglePlatform = (p: AdultBillingPlatform) => {
    if (isControlled) {
      controlled.togglePlatform(p)
      return
    }
    setPlatformSelectionInternal((prev) => {
      const next = new Set(prev)
      if (variant !== 'single') return next
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

  const bandDemoActive =
    !isControlled && !useRevenueForBand && surface !== 'settings' && !bandCyclePaused

  useEffect(() => {
    if (!bandDemoActive) return
    const id = setInterval(() => {
      setTierIndexInternal((prev) => (prev + 1) % REVENUE_TIERS.length)
    }, 3400)
    return () => clearInterval(id)
  }, [bandDemoActive])

  const platformMotionKey = `${variant}:${[...platformSelection].sort().join(',')}`
  const prevPlatformMotionKeyRef = useRef(platformMotionKey)
  useEffect(() => {
    if (prevPlatformMotionKeyRef.current === platformMotionKey) return
    prevPlatformMotionKeyRef.current = platformMotionKey
    if (planGlowTimerRef.current) clearTimeout(planGlowTimerRef.current)
    setPlanGlowPulse(true)
    planGlowTimerRef.current = setTimeout(() => setPlanGlowPulse(false), 720)
    return () => {
      if (planGlowTimerRef.current) clearTimeout(planGlowTimerRef.current)
    }
  }, [platformMotionKey])

  useEffect(() => {
    if (surface === 'settings' || reduceMotion) return
    let cancelled = false
    let step = 0
    let timeoutId: ReturnType<typeof setTimeout>

    const schedule = () => {
      if (cancelled) return
      if (step === 0) {
        setMultiLogoSpotlight('all')
        timeoutId = setTimeout(() => {
          step = 1
          schedule()
        }, 1500)
      } else if (step >= 1 && step <= MULTIPLATFORM_LOGOS.length) {
        setMultiLogoSpotlight(step - 1)
        timeoutId = setTimeout(() => {
          step = step === MULTIPLATFORM_LOGOS.length ? 0 : step + 1
          schedule()
        }, 720)
      }
    }

    schedule()
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [surface, reduceMotion])

  useEffect(() => {
    if (reduceMotion) setMultiLogoSpotlight('all')
  }, [reduceMotion])

  const derivedTier = useMemo(() => {
    const n = Number.parseFloat(revenueInput.replace(/,/g, ''))
    const revenue = Number.isFinite(n) && n >= 0 ? n : 0
    return tierIndexFromMonthlyRevenue(revenue)
  }, [revenueInput])

  const suggestedRow = useMemo(() => getTierByIndex(derivedTier), [derivedTier])
  const effectiveTier = useRevenueForBand ? derivedTier : tierIndex
  const tierRow = getTierByIndex(effectiveTier)

  const sortedPlatforms = useMemo(() => {
    if (variant === 'multi') return sortFocusPlatforms(['onlyfans', 'fansly'])
    return sortFocusPlatforms([...platformSelection])
  }, [variant, platformSelection])

  const focusBothApiPlatforms =
    variant === 'single' &&
    platformSelection.size === 2 &&
    platformSelection.has('onlyfans') &&
    platformSelection.has('fansly')

  const focusListForPrice: AdultBillingPlatform[] | undefined =
    variant === 'multi' ? undefined : sortedPlatforms.length ? sortedPlatforms : ['onlyfans']

  const planMonthlyOneSeat =
    tierRow && !protectionOnly ? getMonthlyPriceUsd(variant, effectiveTier, focusListForPrice) : 0

  const planMonthlySubtotal = protectionOnly ? 0 : planMonthlyOneSeat
  const addonMonthly = protectionOnly
    ? OTHER_PLATFORM_BUNDLE_ADDON_USD
    : otherPlatformBundleEnabled
      ? OTHER_PLATFORM_BUNDLE_ADDON_USD
      : 0
  const monthlyUsd = planMonthlySubtotal + addonMonthly

  const paidCredits = protectionOnly
    ? PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS
    : includedCreditsForMarketing(planMonthlySubtotal, 1)

  const pctVsOf =
    protectionOnly || !tierRow ? 0 : percentVsOnlyFansBase(tierRow, planMonthlyOneSeat)

  const breakdown = useMemo(() => {
    if (protectionOnly) {
      return {
        lines: [{ label: 'Multiplatform protection', usd: OTHER_PLATFORM_BUNDLE_ADDON_USD }],
        note: 'Standalone plan for non-API platform protection coverage.',
      }
    }
    if (!tierRow) return null
    if (variant === 'multi') {
      return {
        lines: [{ label: 'Bundled (OnlyFans + Fansly)', usd: tierRow.multiPriceUsd }],
        note: 'One monthly price for both platforms. Non-API sites: add Protection.',
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
            label: `Focus (${focusPlatformsShortLabel([a, b])})`,
            usd: bundleUsd,
          },
        ],
        note: pairBundleDescription(a, b),
      }
    }
    return null
  }, [tierRow, variant, sortedPlatforms, effectiveTier, protectionOnly])

  const setBundled = () => {
    setProtectionOnly(false)
    setVariant('multi')
    if (!isControlled) {
      setPlatformSelectionInternal(new Set(['onlyfans', 'fansly']))
    } else {
      controlled.setPlatformSelection(new Set(['onlyfans', 'fansly']))
    }
  }

  const setFocusMode = () => {
    setProtectionOnly(false)
    if (variant === 'multi') {
      setVariant('single')
      if (!isControlled) setPlatformSelectionInternal(new Set(['onlyfans']))
      else controlled.setPlatformSelection(new Set(['onlyfans']))
      return
    }
    setVariant('single')
  }

  const Root = surface === 'landing' ? 'div' : 'section'
  const rootClass = cn(
    surface === 'landing'
      ? 'mx-auto w-full max-w-4xl rounded-2xl border border-border/50 bg-card/25 p-6 sm:p-8'
      : 'mx-auto max-w-6xl rounded-2xl border border-border/50 bg-card/20 p-6 sm:p-8',
    surface === 'settings' && 'max-w-none border-border/40 bg-transparent p-0 sm:p-0',
    className,
  )

  const showMarketingChrome = surface !== 'settings'
  const showProtectionFooter = surface !== 'settings'
  const bundledGlowSurface = variant === 'multi' && !protectionOnly
  const focusDualGlow =
    variant === 'single' && focusBothApiPlatforms && !protectionOnly

  return (
    <Root
      className={rootClass}
      {...(surface === 'landing'
        ? { role: 'region', 'aria-label': 'Pricing estimate' }
        : surface === 'settings'
          ? {}
          : { 'aria-labelledby': 'pricing-calculator-heading' })}
    >
      {surface === 'landing' ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Your plan</p>
      ) : surface === 'settings' ? (
        <div className="mb-8 border-b border-border/30 pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Estimate</p>
          <h2 className="mt-2 font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            Same math as checkout
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Band, Focus or Bundled, and platforms—aligned with checkout below.
          </p>
        </div>
      ) : (
        <header className="mb-10 border-b border-border/25 pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Pricing</p>
          <h2 id="pricing-calculator-heading" className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            What you&apos;ll pay
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Choose your revenue band, plan shape, and platforms. Figures match Stripe checkout before discounts or
            taxes.
          </p>
        </header>
      )}

      <div className={cn('grid gap-10 lg:grid-cols-2 lg:gap-14', surface === 'landing' ? 'mt-6' : 'mt-0')}>
        <div className="space-y-8">
          {!useRevenueForBand && (
            <div className="space-y-2">
              <Label htmlFor="pricing-tier-select" className="text-xs text-muted-foreground">
                Revenue band
              </Label>
              <Select
                value={String(tierIndex)}
                onOpenChange={(open) => {
                  if (open) setBandCyclePaused(true)
                }}
                onValueChange={(v) => {
                  setBandCyclePaused(true)
                  setTierIndex(Number.parseInt(v, 10))
                }}
              >
                <SelectTrigger
                  id="pricing-tier-select"
                  className={cn(
                    'h-11 rounded-xl border-border/60 bg-background/50 transition-[box-shadow,transform] duration-500',
                    bandDemoActive &&
                      'shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_0_28px_rgba(168,85,247,0.2)] animate-pulse',
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
              <p className="text-xs leading-relaxed text-muted-foreground">
                Same tiers as checkout. Pick the interval that matches your gross monthly billings.
              </p>
              {bandDemoActive ? (
                <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-400/90">
                  Cycling bands as a preview—open the menu or switch to revenue estimate to hold still.
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              id="pricing-revenue-override"
              checked={useRevenueForBand}
              onCheckedChange={(v) => {
                const on = v === true
                setUseRevenueForBand(on)
                if (!on) setTierIndex(derivedTier)
              }}
            />
            <Label htmlFor="pricing-revenue-override" className="cursor-pointer text-sm font-normal text-foreground/90">
              Estimate band from monthly revenue
            </Label>
          </div>

          {useRevenueForBand && (
            <div className="space-y-2">
              <Label htmlFor="pricing-revenue">Gross monthly revenue (USD)</Label>
              <Input
                id="pricing-revenue"
                inputMode="decimal"
                autoComplete="off"
                placeholder="e.g. 5000"
                value={revenueInput}
                onChange={(e) => setRevenueInput(e.target.value)}
                aria-describedby="pricing-revenue-hint"
                className="h-11 rounded-xl border-border/60"
              />
              <p id="pricing-revenue-hint" className="text-xs text-muted-foreground">
                Maps to {suggestedRow?.label ?? '—'}, same as billing.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-xs text-muted-foreground">Plan</span>
            <div className="flex rounded-full bg-muted/40 p-1">
              <button
                type="button"
                onClick={setFocusMode}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-300',
                  variant === 'single' && !protectionOnly
                    ? cn(
                        'bg-background text-foreground shadow-sm',
                        focusBothApiPlatforms &&
                          'shadow-[0_0_20px_rgba(139,92,246,0.22)] ring-1 ring-violet-400/45',
                      )
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Focus
              </button>
              <button
                type="button"
                onClick={() => {
                  setProtectionOnly(false)
                  setBundled()
                }}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-300',
                  variant === 'multi' && !protectionOnly
                    ? 'bg-background text-foreground shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Bundled
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Focus: one or two platforms at list price. Bundled: OnlyFans + Fansly on the combined band price.
            </p>
          </div>

          {!protectionOnly && (variant === 'single' || variant === 'multi') ? (
            <div className="space-y-3">
              <span className="text-xs text-muted-foreground">Platforms</span>
              <div className="flex flex-wrap gap-3">
                {FOCUS_PLATFORMS.map((p) => {
                  const selected = platformSelection.has(p)
                  const bundledRow = variant === 'multi'
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        if (bundledRow) {
                          setProtectionOnly(false)
                          setVariant('single')
                          if (!isControlled) setPlatformSelectionInternal(new Set([p]))
                          else {
                            controlled.onVariantChange('single')
                            controlled.setPlatformSelection(new Set([p]))
                          }
                          return
                        }
                        togglePlatform(p)
                      }}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-300',
                        bundledRow &&
                          'border-amber-500/45 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.22)]',
                        !bundledRow && selected &&
                          'border-violet-500/45 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.28)]',
                        !bundledRow && !selected && 'border-border/50 bg-background/60 hover:bg-muted/20',
                      )}
                    >
                      <span className="inline-flex h-8 min-w-[3.5rem] max-w-[4.5rem] items-center justify-center overflow-hidden rounded-md border border-border/40 bg-card/80 px-0.5">
                        {p === 'onlyfans' ? (
                          <Image
                            src={ONLYFANS_LOGO_SRC}
                            alt=""
                            width={88}
                            height={20}
                            className={cn(
                              'h-5 w-auto max-w-full object-contain object-left',
                              selected || bundledRow ? 'opacity-100' : 'opacity-45 grayscale',
                            )}
                          />
                        ) : (
                          <Image
                            src={FANSLY_LOGO_SRC}
                            alt=""
                            width={76}
                            height={20}
                            className={cn(
                              'h-5 w-auto max-w-full object-contain object-left',
                              selected || bundledRow ? 'opacity-100' : 'opacity-45 grayscale',
                            )}
                          />
                        )}
                      </span>
                      <span className="font-medium text-foreground/90">{focusPlatformDisplayName(p)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <aside
          className={cn(
            'flex flex-col justify-between rounded-2xl border p-6 sm:p-8 transition-[box-shadow,background-color,border-color] duration-500',
            'border-border/40 bg-muted/15',
            bundledGlowSurface &&
              'border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-purple-500/[0.09] shadow-[0_0_36px_rgba(245,158,11,0.14)]',
            focusDualGlow &&
              !bundledGlowSurface &&
              'border-violet-500/35 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-transparent shadow-[0_0_30px_rgba(139,92,246,0.12)]',
            planGlowPulse && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
          )}
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Estimated monthly
            </p>
            <motion.p
              key={`${monthlyUsd}-${effectiveTier}-${variant}-${protectionOnly ? 'p' : 'f'}`}
              className="mt-3 font-serif text-4xl font-medium tabular-nums tracking-tight text-foreground sm:text-5xl"
              initial={reduceMotion ? false : { opacity: 0.75, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              ${monthlyUsd}
              <span className="text-xl font-normal text-muted-foreground sm:text-2xl">/mo</span>
            </motion.p>
            {monthlyUsd > 0 && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Paid AI credits</span> — about{' '}
                {paidCredits.toLocaleString()}/mo included at this tier (tool access per plan).
              </p>
            )}
            {tierRow && !protectionOnly && (
              <p
                className={cn(
                  'mt-3 text-sm',
                  pctVsOf > 0 && 'text-emerald-600 dark:text-emerald-400',
                  pctVsOf < 0 && 'text-amber-700 dark:text-amber-400',
                  pctVsOf === 0 && 'text-muted-foreground',
                )}
              >
                {pctVsOf > 0 && `About ${pctVsOf}% below OnlyFans list in this band (per seat).`}
                {pctVsOf < 0 && `About ${-pctVsOf}% above OnlyFans list in this band (per seat).`}
                {pctVsOf === 0 && 'Aligned with OnlyFans list in this band (per seat).'}
              </p>
            )}

            {breakdown && breakdown.lines.length > 0 && (
              <ul className="mt-8 space-y-3 border-t border-border/30 pt-6 text-sm">
                {breakdown.lines.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4 tabular-nums text-foreground/85">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span>${row.usd}</span>
                  </li>
                ))}
                {otherPlatformBundleEnabled && !protectionOnly ? (
                  <li className="flex justify-between gap-4 tabular-nums">
                    <span className="text-muted-foreground">Multiplatform protection</span>
                    <span>+${OTHER_PLATFORM_BUNDLE_ADDON_USD}</span>
                  </li>
                ) : null}
                <li className="pt-1 text-xs leading-relaxed text-muted-foreground">{breakdown.note}</li>
              </ul>
            )}
          </div>

          {showMarketingChrome ? (
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 gap-2 rounded-full px-6">
                <Link href="/auth/sign-up" className="inline-flex items-center">
                  <Sparkles className="h-4 w-4" />
                  Start free trial
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-border/60 bg-transparent px-6 shadow-none">
                <Link href={surface === 'landing' ? '/pricing' : '/dashboard/settings?tab=billing'}>
                  {surface === 'landing' ? 'Full pricing page' : 'Open billing'}
                </Link>
              </Button>
            </div>
          ) : (
            <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
              Use <span className="text-foreground">Focus</span> or <span className="text-foreground">Bundled</span>{' '}
              checkout below to subscribe—totals use the same formula.
            </p>
          )}
        </aside>
      </div>

      {showProtectionFooter ? (
        <div className="mt-10 border-t border-border/25 pt-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="grid h-[4.5rem] w-[4.5rem] shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-purple-500/10 p-1.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] sm:h-20 sm:w-20">
              {MULTIPLATFORM_LOGOS.map((src, idx) => {
                const quartet = multiLogoSpotlight === 'all'
                const spotlighted = !quartet && multiLogoSpotlight === idx
                const dimmed = !quartet && multiLogoSpotlight !== idx
                return (
                  <span
                    key={src}
                    className={cn(
                      'inline-flex min-h-0 min-w-0 items-center justify-center rounded-md bg-card/90 transition-all duration-500 ease-out',
                      quartet && 'scale-[0.9] opacity-[0.72]',
                      spotlighted &&
                        'z-[1] scale-100 opacity-100 ring-2 ring-amber-400/75 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
                      dimmed && 'scale-[0.78] opacity-[0.28]',
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      width={40}
                      height={40}
                      className={cn(
                        'object-contain transition-all duration-500 ease-out',
                        quartet && 'h-[14px] w-[14px] sm:h-4 sm:w-4',
                        spotlighted && 'h-7 w-7 sm:h-8 sm:w-8',
                        dimmed && 'h-[11px] w-[11px] sm:h-3 sm:w-3',
                      )}
                    />
                  </span>
                )
              })}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <h3 className="font-medium text-foreground">Multiplatform protection</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Non-API coverage at ${OTHER_PLATFORM_BUNDLE_ADDON_USD}/mo. Add to your plan or subscribe standalone.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={otherPlatformBundleEnabled && !protectionOnly ? 'default' : 'outline'}
                  className="rounded-full"
                  onClick={() => {
                    setProtectionOnly(false)
                    setOtherPlatformBundleEnabled((v) => !v)
                  }}
                >
                  {otherPlatformBundleEnabled && !protectionOnly ? 'Added (+$25/mo)' : 'Add to estimate (+$25/mo)'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={protectionOnly ? 'default' : 'outline'}
                  className="rounded-full"
                  onClick={() => {
                    setOtherPlatformBundleEnabled(false)
                    setProtectionOnly((v) => !v)
                  }}
                >
                  {protectionOnly ? 'Protection only ($25/mo)' : 'Protection only'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Root>
  )
}
