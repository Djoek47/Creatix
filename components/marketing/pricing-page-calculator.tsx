'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
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
import { Info, Sparkles } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  REVENUE_TIERS,
  getMonthlyPriceUsd,
  getTierByIndex,
  tierIndexFromMonthlyRevenue,
  BUNDLE_ANTIPIRACY_ADDON_USD,
  BUNDLE_ANTIPIRACY_SCAN_CREDITS,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import { BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { Checkout } from '@/components/stripe/checkout'
import {
  MULTIPLATFORM_PROTECTION_COMING_SOON,
  PAID_PLAN_ID,
  PROTECTION_PLAN_ID,
} from '@/lib/billing/access'
import {
  sortFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import {
  includedCreditsForMarketing,
  PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS,
} from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'
import {
  BILLING_INSET_PANEL_CLASS,
  BILLING_PRIMARY_CHECKOUT_CTA_CLASS,
  BILLING_PRIMARY_TRIAL_CTA_CLASS,
  BILLING_TRIPLE_STACK_CHECKOUT_CTA_CLASS,
} from '@/lib/billing/billing-plan-visual'
import { CLIP_FOCUS_ADDON_CAROUSEL, BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE } from '@/lib/billing/clip-focus-addon-carousel'
import { BundledAntipiracyStorefrontLogoMark } from '@/components/billing/bundled-antipiracy-storefront-mark'
import { useTranslations } from 'next-intl'
import {
  DEFAULT_TRIAL_SIGNUP_HREF,
  useTrialSignupTransition,
} from '@/components/marketing/trial-signup-transition'

const FOCUS_PLATFORMS: AdultBillingPlatform[] = ['onlyfans', 'fansly']

const OTHER_PLATFORM_BUNDLE_ADDON_USD = 25
/** Protection marketing strip — same storefronts as billing ManyVids row (logos only). */
const BUNDLED_STORE_SLIDE_COUNT = BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE.length

const PROTECTION_TOOL_KEYS = ['dmcaScanner', 'leakDetection', 'reputationTool', 'modelReputation'] as const

/** Calm override control for billing—no gradient/glow; fits settings glass. */
const PRICING_REVENUE_OVERRIDE_CHECKBOX_CLASS = cn(
  'size-[1.0625rem] rounded-[4px] border border-border/65 bg-background/50 shadow-none',
  'dark:border-border/55 dark:bg-background/30 dark:shadow-none dark:data-[state=unchecked]:shadow-none',
  'data-[state=unchecked]:shadow-none',
  'data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background',
  'focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
)

/** Summary column — shared inset surface + layout (settings + landing). */
const PRICING_SUMMARY_ASIDE = cn(
  'flex min-h-0 w-full min-w-0 flex-col justify-between p-8 sm:p-10',
  BILLING_INSET_PANEL_CLASS,
  'lg:min-w-[min(100%,20.5rem)]',
)

const PRICING_SUMMARY_ASIDE_BUNDLED = cn(
  'border-amber-300/35 dark:border-amber-400/18',
  'dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_52px_-24px_rgba(245,158,11,0.18),0_28px_56px_-36px_rgba(0,0,0,0.55)]',
)

const PRICING_SUMMARY_ASIDE_FOCUS = cn(
  'border-violet-300/40 dark:border-violet-400/16',
  'dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_48px_-24px_rgba(139,92,246,0.16),0_28px_56px_-36px_rgba(0,0,0,0.55)]',
)

type BreakdownLines = readonly { label: string; usd: number | null }[]

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
  /** Billing settings: invoked after embedded Stripe checkout completes (sync subscription + credits). */
  onCheckoutComplete?: () => void | Promise<void>
  /**
   * Lowest tier index required from linked OnlyFans/Fansly scoped revenue combined for billing (settings). When set,
   * manual “type your revenue” override is hidden—selection cannot stay below this tier while integrations stay linked.
   */
  requiredMinTierFromObservation?: number | null
  /** Active subscription `revenue_tier` — used for quiet copy when linked data implies a higher band than subscribed. */
  subscribedRevenueTier?: number | null
  /** Latest scoped observation timestamp from `/api/billing/revenue-band-status` (settings copy). */
  observationCapturedAtIso?: string | null
  /** Scoped MTD USD from linked platforms (settings; mirrors gate math). */
  observedOnlyfansMonthlyUsd?: number | null
  observedFanslyMonthlyUsd?: number | null
  observedCombinedMonthlyUsd?: number | null
  /**
   * Settings: OnlyFans and Fansly both linked — revenue band is read-only here (disconnect a platform to
   * change the estimate band). `requiredMinTierFromObservation` may still apply from either platform when only one is linked.
   */
  lockRevenueBand?: boolean
  /** Billing settings: rendered under the OnlyFans / Fansly row when the platform picker is visible; otherwise after controls in the estimate column. */
  belowFocusPlatformsSlot?: ReactNode
}

export function PricingPageCalculator({
  surface = 'default',
  className,
  controlled,
  onCheckoutComplete,
  requiredMinTierFromObservation = null,
  observationCapturedAtIso = null,
  subscribedRevenueTier = null,
  observedOnlyfansMonthlyUsd = null,
  observedFanslyMonthlyUsd = null,
  observedCombinedMonthlyUsd = null,
  lockRevenueBand = false,
  belowFocusPlatformsSlot,
}: PricingPageCalculatorProps = {}) {
  const tm = useTranslations('marketing')
  const tierLabel = useCallback(
    (idx: number) => tm(`pricingCalculator.tierBands.${idx}` as never),
    [tm],
  )
  const tierNumberFallback = useCallback(
    (n: number) => tm('pricingCalculator.tierNumberFallback', { tier: n }),
    [tm],
  )
  const focusName = useCallback(
    (p: AdultBillingPlatform) => {
      if (p === 'onlyfans') return tm('pricingCalculator.focusPlatform.onlyfans')
      if (p === 'fansly') return tm('pricingCalculator.focusPlatform.fansly')
      return tm('pricingCalculator.focusPlatform.antipiracyFocus')
    },
    [tm],
  )
  const focusPlatformsShortTranslated = useCallback(
    (platforms: AdultBillingPlatform[]) => {
      const sorted = sortFocusPlatforms(platforms)
      if (sorted.length === 0) return focusName('onlyfans')
      if (sorted.length === 1) return focusName(sorted[0])
      return sorted.map((p) => focusName(p)).join(tm('pricingCalculator.pairJoiner'))
    },
    [focusName, tm],
  )
  const pairBundleTranslated = useCallback(
    (a: AdultBillingPlatform, b: AdultBillingPlatform) => {
      const addonUsd = (n: number) => `$${n}`
      const s = new Set<AdultBillingPlatform>([a, b])
      if (s.has('onlyfans') && s.has('fansly')) {
        return tm('pricingCalculator.pairFocus.ofFansly', { addon: addonUsd(BUNDLE_ADDONS.FL_ON_OF) })
      }
      if (s.has('onlyfans') && s.has('manyvids')) {
        return tm('pricingCalculator.pairFocus.ofMv', { addon: addonUsd(BUNDLE_ADDONS.MV_ON_OF) })
      }
      return tm('pricingCalculator.pairFocus.flMv', { addon: addonUsd(BUNDLE_ADDONS.MV_ON_FL) })
    },
    [tm],
  )

  const isControlled = controlled != null
  const reduceMotion = useReducedMotion()
  const { beginSignupTransition, isTransitioning } = useTrialSignupTransition()
  const revenueBandLocked = surface === 'settings' && lockRevenueBand

  const [revenueInput, setRevenueInput] = useState('5000')
  const [useRevenueForBand, setUseRevenueForBand] = useState(false)
  const [tierIndexInternal, setTierIndexInternal] = useState(2)
  const [bandCyclePaused, setBandCyclePaused] = useState(false)
  const [planGlowPulse, setPlanGlowPulse] = useState(false)
  /** Multiplatform mark: one logo at a time, full frame, cycling through supported services. */
  const [multiLogoIndex, setMultiLogoIndex] = useState(0)
  const planGlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [otherPlatformBundleEnabledInternal, setOtherPlatformBundleEnabled] = useState(false)
  const [protectionOnlyInternal, setProtectionOnly] = useState(false)
  const otherPlatformBundleEnabled = MULTIPLATFORM_PROTECTION_COMING_SOON
    ? false
    : otherPlatformBundleEnabledInternal
  const protectionOnly = MULTIPLATFORM_PROTECTION_COMING_SOON ? false : protectionOnlyInternal
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

  /** Selecting both API platforms in single-platform mode → same workspace as Bundled (checkout + UX). */
  useEffect(() => {
    if (protectionOnly) return
    if (variant !== 'single') return
    if (platformSelection.size !== 2) return
    if (!platformSelection.has('onlyfans') || !platformSelection.has('fansly')) return

    setProtectionOnly(false)
    if (isControlled) {
      controlled.onVariantChange('multi')
      return
    }
    setVariantInternal('multi')
    setPlatformSelectionInternal((prev) => {
      const next = new Set<AdultBillingPlatform>(['onlyfans', 'fansly'])
      if (prev.has('manyvids')) next.add('manyvids')
      return next
    })
  }, [protectionOnly, variant, platformSelection, isControlled, controlled])

  const tierFloor =
    surface === 'settings' && typeof requiredMinTierFromObservation === 'number'
      ? requiredMinTierFromObservation
      : null

  const onTierIndexChangeCb = controlled?.onTierIndexChange
  useEffect(() => {
    if (!isControlled || tierFloor == null || !onTierIndexChangeCb) return
    if (tierIndex < tierFloor) {
      onTierIndexChangeCb(tierFloor)
    }
  }, [isControlled, tierFloor, tierIndex, onTierIndexChangeCb])

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
    const protectionFooterVisible = MULTIPLATFORM_PROTECTION_COMING_SOON ? true : surface !== 'settings'
    if (reduceMotion || !protectionFooterVisible) return
    const id = setInterval(() => {
      setMultiLogoIndex((i) => (i + 1) % BUNDLED_STORE_SLIDE_COUNT)
    }, 2600)
    return () => clearInterval(id)
  }, [reduceMotion, surface])

  useEffect(() => {
    if (reduceMotion) setMultiLogoIndex(0)
  }, [reduceMotion])

  useEffect(() => {
    if (!revenueBandLocked) return
    setUseRevenueForBand(false)
  }, [revenueBandLocked])

  useEffect(() => {
    if (surface !== 'settings') return
    if (tierFloor == null) return
    setUseRevenueForBand(false)
  }, [surface, tierFloor])

  const derivedTier = useMemo(() => {
    const n = Number.parseFloat(revenueInput.replace(/,/g, ''))
    const revenue = Number.isFinite(n) && n >= 0 ? n : 0
    return tierIndexFromMonthlyRevenue(revenue)
  }, [revenueInput])

  const tierChoices = REVENUE_TIERS

  const suggestedRow = useMemo(() => getTierByIndex(derivedTier), [derivedTier])
  const baseTier = useRevenueForBand ? derivedTier : tierIndex
  const effectiveTier =
    surface === 'settings' && tierFloor != null ? Math.max(baseTier, tierFloor) : baseTier
  const tierRow = getTierByIndex(effectiveTier)

  const sortedPlatforms = useMemo(() => {
    if (variant === 'multi') {
      const s = new Set<AdultBillingPlatform>(['onlyfans', 'fansly'])
      if (platformSelection.has('manyvids')) s.add('manyvids')
      return sortFocusPlatforms([...s])
    }
    return sortFocusPlatforms([...platformSelection])
  }, [variant, platformSelection])

  const focusBothApiPlatforms =
    variant === 'single' &&
    platformSelection.size === 2 &&
    platformSelection.has('onlyfans') &&
    platformSelection.has('fansly')

  /** Bundled OF+Fansly plus Multiplatform protection add-on in the estimate. */
  const tripleStackCheckout =
    !protectionOnly && variant === 'multi' && otherPlatformBundleEnabled

  const focusListForPrice: AdultBillingPlatform[] | undefined =
    variant === 'multi'
      ? platformSelection.has('manyvids')
        ? (['onlyfans', 'fansly', 'manyvids'] as AdultBillingPlatform[])
        : undefined
      : sortedPlatforms.length
        ? sortedPlatforms
        : ['onlyfans']

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

  const breakdown = useMemo(() => {
    if (protectionOnly) {
      return {
        lines: [{ label: tm('pricingCalculator.breakdown.multiplatformProtection'), usd: OTHER_PLATFORM_BUNDLE_ADDON_USD }] satisfies BreakdownLines,
        note: tm('pricingCalculator.breakdown.protectionOnlyLead'),
      }
    }
    if (!tierRow) return null
    if (variant === 'multi') {
      const lines: { label: string; usd: number | null }[] = [
        { label: tm('pricingCalculator.breakdown.bundledOfFl'), usd: tierRow.multiPriceUsd },
      ]
      if (sortedPlatforms.includes('manyvids')) {
        lines.push({
          label: tm('pricingCalculator.breakdown.antiPiracyCreditsAllocated', {
            credits: BUNDLE_ANTIPIRACY_SCAN_CREDITS,
          }),
          usd: null,
        })
        lines.push({
          label: tm('pricingCalculator.breakdown.antiPiracyFee'),
          usd: BUNDLE_ANTIPIRACY_ADDON_USD,
        })
      }
      const creditsAllocated = BUNDLE_ANTIPIRACY_SCAN_CREDITS
      return {
        lines,
        note: MULTIPLATFORM_PROTECTION_COMING_SOON
          ? surface === 'settings'
            ? tm('pricingCalculator.breakdown.noteBundledSoonSettings', {
                credits: creditsAllocated,
              })
            : tm('pricingCalculator.breakdown.noteBundledSoonMarketing')
          : surface === 'settings'
            ? tm('pricingCalculator.breakdown.noteBundledLiveSettings', { credits: creditsAllocated })
            : tm('pricingCalculator.breakdown.noteBundledLiveMarketing'),
      }
    }
    if (sortedPlatforms.length === 1) {
      const p = sortedPlatforms[0]
      return {
        lines: [
          {
            label: focusName(p),
            usd: getMonthlyPriceUsd('single', effectiveTier, [p]),
          },
        ],
        note: tm('pricingCalculator.noteSinglePlatform'),
      }
    }
    if (sortedPlatforms.length === 2) {
      const [a, b] = sortedPlatforms
      const bundleUsd = getMonthlyPriceUsd('single', effectiveTier, [a, b])
      return {
        lines: [
          {
            label: tm('pricingCalculator.singlePlatformCombined', {
              pair: focusPlatformsShortTranslated([a, b]),
            }),
            usd: bundleUsd,
          },
        ],
        note: pairBundleTranslated(a, b),
      }
    }
    return null
  }, [
    tm,
    protectionOnly,
    tierRow,
    variant,
    sortedPlatforms,
    effectiveTier,
    surface,
    focusName,
    focusPlatformsShortTranslated,
    pairBundleTranslated,
  ])

  const setBundled = () => {
    setProtectionOnly(false)
    setVariant('multi')
    const next = new Set<AdultBillingPlatform>(['onlyfans', 'fansly'])
    if (platformSelection.has('manyvids')) next.add('manyvids')
    if (!isControlled) {
      setPlatformSelectionInternal(next)
    } else {
      controlled.setPlatformSelection(next)
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
  const showProtectionFooter = MULTIPLATFORM_PROTECTION_COMING_SOON ? true : surface !== 'settings'
  const bundledGlowSurface = variant === 'multi' && !protectionOnly
  const focusDualGlow =
    variant === 'single' && focusBothApiPlatforms && !protectionOnly
  const isSettings = surface === 'settings'
  const platformsPickerVisible = !protectionOnly && (variant === 'single' || variant === 'multi')

  const bundledProtectionAsideLogoMark = (
    <div
      className={cn(
        'relative flex h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-purple-500/10 p-2 shadow-[0_0_20px_rgba(245,158,11,0.15)] sm:h-20 sm:w-20 sm:p-2.5',
        MULTIPLATFORM_PROTECTION_COMING_SOON && 'opacity-90',
      )}
      aria-hidden
    >
      <motion.span
        key={multiLogoIndex}
        className="flex h-full w-full items-center justify-center rounded-md bg-card/85"
        initial={reduceMotion ? false : { opacity: 0.35 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <BundledAntipiracyStorefrontLogoMark
          slide={BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE[multiLogoIndex % BUNDLED_STORE_SLIDE_COUNT]}
          frame="pricingAside"
        />
      </motion.span>
    </div>
  )

  /** Linked observations set a floor: manual USD override only before that signal exists (or on marketing pages). */
  const showManualRevenueOverride = !revenueBandLocked && !(isSettings && tierFloor != null)
  const subscribedBelowLinkedFloor =
    isSettings &&
    typeof subscribedRevenueTier === 'number' &&
    subscribedRevenueTier >= 0 &&
    tierFloor != null &&
    subscribedRevenueTier < tierFloor
  const tierSelectControlledValue =
    tierFloor != null ? String(Math.max(tierIndex, tierFloor)) : String(tierIndex)

  const triggerShowsLinkedBand =
    isSettings && tierFloor != null && tierSelectControlledValue === String(tierFloor)

  const formatScopedUsd = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 })

  return (
    <Root
      className={rootClass}
      {...(surface === 'landing'
        ? { role: 'region', 'aria-label': tm('pricingCalculator.landingAria') }
        : surface === 'settings'
          ? {}
          : { 'aria-labelledby': 'pricing-calculator-heading' })}
    >
      {surface === 'landing' ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {tm('pricingCalculator.landingEyebrow')}
        </p>
      ) : surface === 'settings' ? (
        <header className="mb-5 flex flex-col gap-3 border-b border-border/20 pb-5 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:pb-6 dark:border-white/[0.06]">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/80 dark:text-muted-foreground/65">
              {tm('pricingCalculator.settingsEyebrow')}
            </p>
            <h2 className="font-serif text-xl font-medium tracking-tight text-foreground sm:text-2xl">
              {tm('pricingCalculator.settingsEstimateTitle')}
            </h2>
          </div>
          <p className="max-w-md text-[13px] leading-snug text-muted-foreground sm:max-w-[20rem] sm:text-right">
            {tm('pricingCalculator.settingsEstimateSubtitle')}
          </p>
        </header>
      ) : (
        <header className="mb-10 border-b border-border/25 pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {tm('pricingCalculator.defaultEyebrow')}
          </p>
          <h2 id="pricing-calculator-heading" className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            {tm('pricingCalculator.defaultHeading')}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {tm('pricingCalculator.defaultSubtitle')}
          </p>
        </header>
      )}

      <div
        className={cn(
          'grid',
          isSettings && 'mt-0 gap-6 lg:grid-cols-[minmax(0,1fr)_min(18.5rem,36%)] lg:items-start lg:gap-8 xl:gap-10',
          !isSettings && 'gap-10 lg:grid-cols-2',
          surface === 'landing' && 'mt-6 lg:gap-14',
          surface !== 'landing' && !isSettings && 'mt-0 lg:gap-12 xl:gap-16',
        )}
      >
        <div className={cn('min-w-0', isSettings ? 'space-y-5' : 'space-y-8')}>
          {!useRevenueForBand && (
            <div className="space-y-2">
              <Label
                htmlFor={revenueBandLocked ? 'pricing-tier-readonly' : 'pricing-tier-select'}
                className="text-xs text-muted-foreground"
              >
                {tm('pricingCalculator.revenueBand')}
              </Label>
              {revenueBandLocked ? (
                <div
                  id="pricing-tier-readonly"
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'flex min-h-[2.75rem] items-center rounded-xl border border-border/50 bg-background/35 px-3.5 text-[14px] font-medium tracking-tight text-foreground',
                    tierFloor != null &&
                      'border-amber-500/35 bg-gradient-to-r from-amber-500/[0.08] via-violet-500/[0.06] to-background/35 dark:border-amber-400/22',
                  )}
                >
                  {getTierByIndex(effectiveTier) ? tierLabel(effectiveTier) : tm('pricingCalculator.emDashPlaceholder')}
                </div>
              ) : (
                <Select
                  value={tierSelectControlledValue}
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
                      'h-11 rounded-xl border-border/60 bg-background/50 transition-[box-shadow] duration-500',
                      'motion-safe:animate-[marketing-float-soft_5s_ease-in-out_infinite] motion-reduce:animate-none',
                      bandDemoActive &&
                        'shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_0_28px_rgba(168,85,247,0.2)]',
                      triggerShowsLinkedBand &&
                        'border-amber-500/40 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_0_22px_rgba(167,139,250,0.14)] dark:border-amber-400/25 dark:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.22),0_0_26px_rgba(139,92,246,0.12)]',
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tierChoices.map((bandRow) => {
                      const belowFloor =
                        isSettings && tierFloor != null && bandRow.tierIndex < tierFloor
                      const linkedBand = isSettings && tierFloor != null && bandRow.tierIndex === tierFloor
                      return (
                        <SelectItem
                          key={bandRow.tierIndex}
                          value={String(bandRow.tierIndex)}
                          disabled={belowFloor}
                          className={cn(
                            linkedBand &&
                              'my-0.5 bg-gradient-to-r from-amber-500/16 via-violet-500/12 to-amber-400/10 text-foreground shadow-[inset_0_0_0_1px_rgba(245,158,11,0.28),inset_0_0_26px_rgba(139,92,246,0.07)] dark:from-amber-400/12 dark:via-violet-500/10 dark:to-amber-300/8 dark:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.22),inset_0_0_26px_rgba(167,139,250,0.08)]',
                          )}
                        >
                          <span className="flex w-full items-center justify-between gap-3 pr-1">
                            <span>{tierLabel(bandRow.tierIndex)}</span>
                            {linkedBand ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/35 bg-violet-500/[0.09] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-900 dark:border-amber-400/25 dark:bg-violet-400/[0.08] dark:text-amber-100/95">
                                <Sparkles className="size-3 opacity-85" aria-hidden />
                                {tm('pricingCalculator.linkedBadge')}
                              </span>
                            ) : null}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
              <p className={cn('text-muted-foreground', isSettings ? 'text-[11px] leading-snug' : 'text-xs leading-relaxed')}>
                {isSettings && revenueBandLocked ? (
                  <>
                    {tm('pricingCalculator.revenue.helpLockedP1')}
                    {tierFloor != null ? (
                      <>
                        {' '}
                        {tm('pricingCalculator.revenue.helpLockedP2', {
                          band: getTierByIndex(tierFloor)
                            ? tierLabel(tierFloor)
                            : tierNumberFallback(tierFloor),
                        })}
                      </>
                    ) : null}
                    {observationCapturedAtIso ? (
                      <>
                        {' '}
                        {tm('pricingCalculator.revenue.updated', {
                          when: Number.isFinite(Date.parse(observationCapturedAtIso))
                            ? new Date(observationCapturedAtIso).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : observationCapturedAtIso,
                        })}
                      </>
                    ) : null}{' '}
                    {tm('pricingCalculator.revenue.helpLockedP3')}
                  </>
                ) : isSettings && tierFloor != null ? (
                  <>
                    {tm('pricingCalculator.revenue.helpPartialLinkedP1', {
                      band: getTierByIndex(tierFloor)
                        ? tierLabel(tierFloor)
                        : tierNumberFallback(tierFloor),
                    })}
                    {observationCapturedAtIso ? (
                      <>
                        {' '}
                        {tm('pricingCalculator.revenue.updated', {
                          when: Number.isFinite(Date.parse(observationCapturedAtIso))
                            ? new Date(observationCapturedAtIso).toLocaleString()
                            : observationCapturedAtIso,
                        })}
                      </>
                    ) : null}
                  </>
                ) : isSettings ? (
                  tm('pricingCalculator.revenue.helpSettingsSimple')
                ) : (
                  tm('pricingCalculator.revenue.helpMarketingSimple')
                )}
              </p>
              {isSettings && typeof observedCombinedMonthlyUsd === 'number' ? (
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/90">
                    {tm('pricingCalculator.revenue.linkedMtdLead')}{' '}
                  </span>
                  <span className="tabular-nums text-foreground/95">${formatScopedUsd(observedCombinedMonthlyUsd)}</span>
                  {typeof observedOnlyfansMonthlyUsd === 'number' ||
                  typeof observedFanslyMonthlyUsd === 'number' ? (
                    <span className="text-muted-foreground">
                      {' '}
                      (
                      {typeof observedOnlyfansMonthlyUsd === 'number' ? (
                        <>
                          {tm('pricingCalculator.revenue.onlyFansLabel', {
                            amount: `$${formatScopedUsd(observedOnlyfansMonthlyUsd)}`,
                          })}
                        </>
                      ) : null}
                      {typeof observedOnlyfansMonthlyUsd === 'number' &&
                      typeof observedFanslyMonthlyUsd === 'number'
                        ? ' · '
                        : null}
                      {typeof observedFanslyMonthlyUsd === 'number' ? (
                        <>
                          {tm('pricingCalculator.revenue.fanslyLabel', {
                            amount: `$${formatScopedUsd(observedFanslyMonthlyUsd)}`,
                          })}
                        </>
                      ) : null}
                      )
                    </span>
                  ) : null}
                </p>
              ) : null}
              {subscribedBelowLinkedFloor ? (
                <p className="mt-2 max-w-[52ch] text-[11px] leading-snug text-muted-foreground">
                  {tm('pricingCalculator.revenue.subscribedBelowFloor')}
                </p>
              ) : null}
              {bandDemoActive ? (
                <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-400/90">
                  {tm('pricingCalculator.revenue.bandPreviewCycling')}
                </p>
              ) : null}
            </div>
          )}

          {showManualRevenueOverride ? (
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <Checkbox
                id="pricing-revenue-override"
                checked={useRevenueForBand}
                className={PRICING_REVENUE_OVERRIDE_CHECKBOX_CLASS}
                onCheckedChange={(v) => {
                  const on = v === true
                  setUseRevenueForBand(on)
                  if (!on) {
                    const next = tierFloor != null ? Math.max(derivedTier, tierFloor) : derivedTier
                    setTierIndex(next)
                  }
                }}
              />
              <Label
                htmlFor="pricing-revenue-override"
                className="cursor-pointer text-[13px] font-normal leading-snug tracking-[-0.01em] text-foreground/90"
              >
                {tm('pricingCalculator.revenue.overrideLabel')}
                <span className="mt-1 block text-[11px] font-normal tracking-normal text-muted-foreground">
                  {tm('pricingCalculator.revenue.overrideHint')}
                </span>
              </Label>
            </div>
          ) : null}

          {useRevenueForBand && (
            <div className="space-y-2">
              <Label htmlFor="pricing-revenue">{tm('pricingCalculator.revenue.grossMonthlyUsdLabel')}</Label>
              <Input
                id="pricing-revenue"
                inputMode="decimal"
                autoComplete="off"
                placeholder={tm('pricingCalculator.revenue.placeholderExample')}
                value={revenueInput}
                onChange={(e) => setRevenueInput(e.target.value)}
                aria-describedby="pricing-revenue-hint"
                className="h-11 rounded-xl border-border/60"
              />
              <p
                id="pricing-revenue-hint"
                className={cn('text-muted-foreground', isSettings ? 'text-[11px] leading-snug' : 'text-xs')}
              >
                {isSettings
                  ? tm('pricingCalculator.revenue.mapsToSettings', {
                      band: suggestedRow
                        ? tierLabel(suggestedRow.tierIndex)
                        : tm('pricingCalculator.emDashPlaceholder'),
                    })
                  : tm('pricingCalculator.revenue.mapsToMarketing', {
                      band: suggestedRow
                        ? tierLabel(suggestedRow.tierIndex)
                        : tm('pricingCalculator.emDashPlaceholder'),
                    })}
              </p>
              {tierFloor != null && derivedTier < tierFloor ? (
                <p className="text-[11px] leading-snug text-amber-800/90 dark:text-amber-400/85">
                  {tm('pricingCalculator.revenue.requiresMinTier', {
                    band: getTierByIndex(tierFloor)
                      ? tierLabel(tierFloor)
                      : tierNumberFallback(tierFloor),
                  })}
                </p>
              ) : null}
            </div>
          )}

          <div className={cn(isSettings ? 'space-y-2' : 'space-y-3')}>
            <span className={cn('text-muted-foreground', isSettings ? 'text-[11px] font-medium' : 'text-xs')}>
              {tm('pricingCalculator.planHeading')}
            </span>
            <div className="flex rounded-full bg-muted/35 p-0.5 dark:bg-muted/25">
              <button
                type="button"
                onClick={setFocusMode}
                className={cn(
                  'flex-1 rounded-full text-sm font-medium transition-[color,box-shadow,transform] duration-300',
                  isSettings ? 'py-2' : 'py-2.5',
                  variant === 'single' && !protectionOnly
                    ? cn(
                        'bg-background text-foreground shadow-sm',
                        focusBothApiPlatforms &&
                          (isSettings
                            ? 'ring-1 ring-border/50 dark:ring-white/[0.08]'
                            : 'shadow-[0_0_20px_rgba(139,92,246,0.22)] ring-1 ring-violet-400/45'),
                      )
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tm('pricingCalculator.singlePlatform')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProtectionOnly(false)
                  setBundled()
                }}
                className={cn(
                  'flex-1 rounded-full text-sm font-medium transition-[color,box-shadow,transform] duration-300',
                  isSettings ? 'py-2' : 'py-2.5',
                  variant === 'multi' && !protectionOnly
                    ? cn(
                        'bg-background text-foreground shadow-sm',
                        isSettings
                          ? 'ring-1 ring-border/50 dark:ring-amber-400/15'
                          : 'shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50',
                      )
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tm('pricingCalculator.bundled')}
              </button>
            </div>
          </div>

          {platformsPickerVisible ? (
            <div className={cn(isSettings ? 'space-y-2' : 'space-y-3')}>
              <span className={cn('text-muted-foreground', isSettings ? 'text-[11px] font-medium' : 'text-xs')}>
                {tm('pricingCalculator.platformsHeading')}
              </span>
              <div className={cn('flex flex-wrap', isSettings ? 'gap-2' : 'gap-3')}>
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
                        'flex items-center rounded-xl border text-sm transition-[border-color,background-color,box-shadow] duration-300',
                        isSettings ? 'min-h-10 gap-2 px-2.5 py-1.5' : 'min-h-11 gap-3 px-3 py-2',
                        bundledRow &&
                          (isSettings
                            ? 'border-border/55 bg-muted/20 dark:border-amber-400/20 dark:bg-amber-500/[0.06]'
                            : 'border-amber-500/45 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.22)]'),
                        !bundledRow &&
                          selected &&
                          (isSettings
                            ? 'border-border/60 bg-muted/25 ring-1 ring-border/30 dark:border-white/[0.09] dark:bg-white/[0.04]'
                            : 'border-violet-500/45 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.28)]'),
                        !bundledRow && !selected && 'border-border/50 bg-background/60 hover:bg-muted/20',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center justify-center',
                          isSettings
                            ? 'relative h-8 min-w-[2.85rem] max-w-[5rem] overflow-visible bg-transparent px-0'
                            : 'h-8 min-w-[3.5rem] max-w-[4.5rem] overflow-hidden rounded-md border border-border/40 bg-card/80 px-0.5',
                        )}
                      >
                        {p === 'onlyfans' ? (
                          <Image
                            src={ONLYFANS_LOGO_SRC}
                            alt=""
                            width={88}
                            height={20}
                            className={cn(
                              isSettings
                                ? 'h-11 w-auto max-w-none object-contain object-left sm:h-12'
                                : 'h-5 w-auto max-w-full object-contain object-left',
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
                              isSettings
                                ? 'h-11 w-auto max-w-none object-contain object-left sm:h-12'
                                : 'h-5 w-auto max-w-full object-contain object-left',
                              selected || bundledRow ? 'opacity-100' : 'opacity-45 grayscale',
                            )}
                          />
                        )}
                      </span>
                      <span className="font-medium text-foreground/90">{focusName(p)}</span>
                    </button>
                  )
                })}
              </div>
              {isSettings && belowFocusPlatformsSlot ? (
                <div className="mt-3 border-t border-border/25 pt-4">{belowFocusPlatformsSlot}</div>
              ) : null}
            </div>
          ) : null}
          {isSettings && belowFocusPlatformsSlot && !platformsPickerVisible ? (
            <div className="border-t border-border/25 pt-5">{belowFocusPlatformsSlot}</div>
          ) : null}
        </div>

        <aside
          className={cn(
            PRICING_SUMMARY_ASIDE,
            isSettings && 'p-6 sm:p-7 lg:min-w-0',
            bundledGlowSurface && PRICING_SUMMARY_ASIDE_BUNDLED,
            focusDualGlow && !bundledGlowSurface && PRICING_SUMMARY_ASIDE_FOCUS,
            planGlowPulse &&
              cn(
                'ring-1 ring-offset-2 ring-offset-background',
                isSettings
                  ? 'ring-amber-400/20 dark:ring-amber-300/18'
                  : 'ring-amber-400/30 dark:ring-amber-300/25',
              ),
          )}
        >
          <div className="flex flex-col">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground/80 dark:text-muted-foreground/65">
                {tm('pricingCalculator.aside.estimatedMonthly')}
              </p>
              <motion.div
                key={`${monthlyUsd}-${effectiveTier}-${variant}-${protectionOnly ? 'p' : 'f'}`}
                className={cn(isSettings ? 'mt-5' : 'mt-8')}
                initial={reduceMotion ? false : { opacity: 0.82, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }}
              >
                <p
                  className={cn(
                    'font-serif font-medium leading-none tracking-tight text-foreground',
                    isSettings ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl',
                  )}
                >
                  <span className="tabular-nums">${monthlyUsd}</span>
                  <span
                    className={cn(
                      'ml-1.5 align-baseline font-normal text-muted-foreground/85',
                      isSettings ? 'text-lg sm:text-xl' : 'text-[1.35rem] sm:text-2xl',
                    )}
                  >
                    {tm('pricingCalculator.aside.perMo')}
                  </span>
                </p>
              </motion.div>
            </div>

            {monthlyUsd > 0 ? (
              <div
                className={cn(
                  'border-t border-border/[0.08] dark:border-white/[0.06]',
                  isSettings ? 'mt-8 pt-6' : 'mt-12 pt-10',
                )}
              >
                <dl className="space-y-0">
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    {tm('pricingCalculator.aside.includedAiCredits')}
                  </dt>
                  <dd
                    className={cn(
                      'mt-2 font-serif font-medium tabular-nums tracking-tight text-foreground',
                      isSettings ? 'text-2xl sm:text-[1.75rem]' : 'text-3xl sm:text-[2.125rem]',
                    )}
                  >
                    {paidCredits.toLocaleString()}
                  </dd>
                  <dd
                    className={cn(
                      'text-muted-foreground',
                      isSettings
                        ? 'mt-2 max-w-[26ch] text-[12px] leading-snug'
                        : 'mt-3 max-w-[30ch] text-[13px] leading-[1.58]',
                    )}
                  >
                    {isSettings
                      ? tm('pricingCalculator.aside.creditsExplainSettings')
                      : tm('pricingCalculator.aside.creditsExplainMarketing')}
                  </dd>
                </dl>
              </div>
            ) : null}

            {breakdown && breakdown.lines.length > 0 ? (
              <div
                className={cn(
                  'border-t border-border/[0.08] dark:border-white/[0.06]',
                  isSettings ? 'mt-8 pt-6' : 'mt-12 pt-10',
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/75 dark:text-muted-foreground/65">
                  {tm('pricingCalculator.aside.composition')}
                </p>
                <ul className={cn('leading-snug', isSettings ? 'mt-3 space-y-3 text-[12px]' : 'mt-5 space-y-4 text-[13px]')}>
                  {breakdown.lines.map((row, idx) => (
                    <li
                      key={`${row.label}-${idx}`}
                      className="flex items-baseline justify-between gap-4 tabular-nums sm:gap-6"
                    >
                      <span className="min-w-0 text-muted-foreground">{row.label}</span>
                      <span
                        className={cn(
                          'shrink-0 font-medium',
                          row.usd == null ? 'text-muted-foreground/85' : 'text-foreground',
                        )}
                      >
                        {row.usd == null ? tm('pricingCalculator.emDashPlaceholder') : `$${row.usd}`}
                      </span>
                    </li>
                  ))}
                  {otherPlatformBundleEnabled && !protectionOnly ? (
                    <li className="flex items-baseline justify-between gap-4 tabular-nums sm:gap-6">
                      <span className="min-w-0 text-muted-foreground">
                        {tm('pricingCalculator.breakdown.multiplatformProtection')}
                      </span>
                      <span className="shrink-0 font-medium text-foreground">+${OTHER_PLATFORM_BUNDLE_ADDON_USD}</span>
                    </li>
                  ) : null}
                </ul>
                {breakdown.note ? (
                  <p
                    className={cn(
                      'leading-relaxed text-muted-foreground/90',
                      isSettings ? 'mt-4 text-[11px]' : 'mt-6 text-[12px]',
                    )}
                  >
                    {breakdown.note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {showMarketingChrome ? (
            <div className="mt-14 flex flex-col gap-3 sm:mt-16 sm:flex-row sm:items-stretch">
              <Button
                type="button"
                className={BILLING_PRIMARY_TRIAL_CTA_CLASS}
                disabled={isTransitioning}
                onClick={() => beginSignupTransition(DEFAULT_TRIAL_SIGNUP_HREF)}
              >
                <Sparkles className="h-4 w-4 opacity-95" />
                {tm('pricingCalculator.marketing.startTrial')}
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-2xl border-border/45 bg-transparent px-6 text-[15px] font-medium shadow-none transition-colors hover:border-border/70 hover:bg-muted/20"
              >
                <Link href={surface === 'landing' ? '/pricing' : '/dashboard/settings?tab=billing'}>
                  {surface === 'landing'
                    ? tm('pricingCalculator.marketing.fullPricingPage')
                    : tm('pricingCalculator.marketing.openBilling')}
                </Link>
              </Button>
            </div>
          ) : surface === 'settings' && onCheckoutComplete ? (
            <div className={cn('flex flex-col gap-2.5', isSettings ? 'mt-8 sm:mt-10' : 'mt-14 sm:mt-16')}>
              {!protectionOnly && planMonthlySubtotal > 0 ? (
                <Checkout
                  productId={PAID_PLAN_ID}
                  billingVariant={variant}
                  tierIndex={effectiveTier}
                  focusPlatforms={
                    variant === 'single'
                      ? sortedPlatforms
                      : variant === 'multi' && platformSelection.has('manyvids')
                        ? (['onlyfans', 'fansly', 'manyvids'] as AdultBillingPlatform[])
                        : null
                  }
                  buttonText={tm('pricingCalculator.subscribePlan', {
                    price: `$${planMonthlySubtotal}`,
                    period: tm('pricingCalculator.aside.perMo'),
                  })}
                  buttonClassName={cn(
                    BILLING_PRIMARY_CHECKOUT_CTA_CLASS,
                    isSettings && 'h-11',
                    tripleStackCheckout && BILLING_TRIPLE_STACK_CHECKOUT_CTA_CLASS,
                  )}
                  onComplete={onCheckoutComplete}
                />
              ) : null}
              {protectionOnly ? (
                <Checkout
                  productId={PROTECTION_PLAN_ID}
                  buttonText={tm('pricingCalculator.subscribeProtection', {
                    price: `$${OTHER_PLATFORM_BUNDLE_ADDON_USD}`,
                    period: tm('pricingCalculator.aside.perMo'),
                  })}
                  buttonClassName={cn(BILLING_PRIMARY_CHECKOUT_CTA_CLASS, isSettings && 'h-11')}
                  onComplete={onCheckoutComplete}
                />
              ) : null}
            </div>
          ) : (
            <p className={cn('text-[12px] leading-relaxed text-muted-foreground', isSettings ? 'mt-8 sm:mt-10' : 'mt-14 sm:mt-16')}>
              {tm.rich('pricingCalculator.subscribeFromPricingRich', {
                link: (chunks) => (
                  <Link href="/pricing" className="font-medium text-foreground underline-offset-4 hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </aside>
      </div>

      {showProtectionFooter ? (
        <div className="mt-10 border-t border-border/25 pt-10">
          {MULTIPLATFORM_PROTECTION_COMING_SOON ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {bundledProtectionAsideLogoMark}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-foreground">{tm('pricingCalculator.footer.multiplatformHeading')}</h3>
                  <Badge variant="secondary" className="font-medium">
                    {tm('pricingCalculator.footer.comingSoonBadge')}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tm('pricingCalculator.footer.comingSoonBody')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {bundledProtectionAsideLogoMark}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="font-medium text-foreground">{tm('pricingCalculator.footer.multiplatformHeading')}</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={tm('pricingCalculator.footer.multiplatformAria')}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="top"
                      sideOffset={8}
                      className="w-[min(22.5rem,calc(100vw-2rem))] rounded-2xl border border-border/35 bg-popover/95 p-6 text-[13px] leading-[1.45] text-muted-foreground shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] backdrop-blur-sm antialiased sm:p-7"
                    >
                      <div className="flex flex-col gap-8">
                        <header>
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/65">
                            {tm('pricingCalculator.footer.multiplatformHeading')}
                          </p>
                        </header>

                        <section className="space-y-3" aria-labelledby="protection-popover-storefronts">
                          <p
                            id="protection-popover-storefronts"
                            className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/55"
                          >
                            {tm('pricingCalculator.footer.popover.sectionStorefronts')}
                          </p>
                          <ul className="flex flex-col gap-2.5">
                            {CLIP_FOCUS_ADDON_CAROUSEL.map((e) => (
                              <li
                                key={e.id}
                                className="border-l border-border/40 pl-3 text-[14px] leading-snug text-foreground/[0.92]"
                              >
                                {tm(`pricingCalculator.footer.storefront.${e.id}` as never)}
                              </li>
                            ))}
                          </ul>
                        </section>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent" aria-hidden />

                        <section className="space-y-3" aria-labelledby="protection-popover-tools">
                          <p
                            id="protection-popover-tools"
                            className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/55"
                          >
                            {tm('pricingCalculator.footer.popover.sectionTools')}
                          </p>
                          <ul className="flex flex-col gap-2.5">
                            {PROTECTION_TOOL_KEYS.map((key) => (
                              <li
                                key={key}
                                className="border-l border-border/40 pl-3 text-[14px] leading-snug text-foreground/[0.92]"
                              >
                                {tm(`pricingCalculator.footer.tools.${key}` as never)}
                              </li>
                            ))}
                          </ul>
                        </section>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tm('pricingCalculator.footer.liveBody', {
                    usd: `$${OTHER_PLATFORM_BUNDLE_ADDON_USD}`,
                  })}
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
                    {otherPlatformBundleEnabled && !protectionOnly
                      ? tm('pricingCalculator.footer.toggle.addedEstimate', {
                          usd: `$${OTHER_PLATFORM_BUNDLE_ADDON_USD}`,
                        })
                      : tm('pricingCalculator.footer.toggle.addEstimate', {
                          usd: `$${OTHER_PLATFORM_BUNDLE_ADDON_USD}`,
                        })}
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
                    {protectionOnly
                      ? tm('pricingCalculator.footer.toggle.protectionOnlyActive', {
                          usd: `$${OTHER_PLATFORM_BUNDLE_ADDON_USD}`,
                        })
                      : tm('pricingCalculator.footer.toggle.protectionOnly')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Root>
  )
}
