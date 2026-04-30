'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { LandingPricingSection } from '@/components/marketing/landing-pricing-section'
import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { ArrowRight } from 'lucide-react'
import { useMarketingMode } from '@/components/marketing/marketing-mode-context'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC, MANYVIDS_LOGO_SRC } from '@/lib/platform-logos'

const ROTATE_MS = 10_000

type BaseKey = 'of' | 'fl' | 'ap'

type BaseOption = {
  key: BaseKey
  name: string
  price: number
  logoSrc: string | null
}

type RotatingPlatformMark = {
  name: string
  logoSrc?: string
  short?: string
}

export function HomePricingSwitch() {
  const { mode } = useMarketingMode()
  const reduce = useReducedMotion()
  const tier0 = PRICING_TIERS[0]!
  const antiPiracyPlatforms = useMemo<RotatingPlatformMark[]>(
    () => [
      { name: 'ManyVids', logoSrc: MANYVIDS_LOGO_SRC },
      { name: 'MYM', logoSrc: '/mym-logo.png' },
      { name: 'Clips4Sale', logoSrc: '/clips4sale-logo.png' },
      { name: 'LoyalFans', logoSrc: '/loyalfans-logo.svg' },
      { name: 'Fanvue', logoSrc: '/fanvue-logo.png' },
    ],
    [],
  )

  const bases = useMemo<BaseOption[]>(
    () => [
      {
        key: 'of',
        name: 'OnlyFans',
        price: tier0.prices.of,
        logoSrc: ONLYFANS_LOGO_SRC,
      },
      {
        key: 'fl',
        name: 'Fansly',
        price: tier0.prices.fl,
        logoSrc: FANSLY_LOGO_SRC,
      },
      {
        key: 'ap',
        name: 'Anti-piracy bundle',
        price: 25,
        logoSrc: null,
      },
    ],
    [tier0.prices.of, tier0.prices.fl],
  )

  const [active, setActive] = useState<BaseKey>('of')
  const [hovered, setHovered] = useState<BaseKey | null>(null)
  const [antiPiracyIndex, setAntiPiracyIndex] = useState(0)

  const displayed = hovered ?? active
  const headlinePrice = bases.find((b) => b.key === displayed)?.price ?? tier0.prices.of

  const advance = useCallback(() => {
    setActive((prev) => {
      const i = bases.findIndex((b) => b.key === prev)
      return bases[(i + 1) % bases.length]!.key
    })
  }, [bases])

  useEffect(() => {
    if (reduce || hovered) return
    const id = window.setInterval(advance, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [reduce, hovered, advance])

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setAntiPiracyIndex((prev) => (prev + 1) % antiPiracyPlatforms.length)
    }, 2400)
    return () => window.clearInterval(id)
  }, [reduce, antiPiracyPlatforms.length])

  if (mode === 'pro') return <LandingPricingSection embedded />

  return (
    <section id="pricing" className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Starting at</p>
        <div className="mt-2 flex min-h-[3.25rem] items-baseline justify-center gap-1 sm:min-h-[3.5rem]">
          <span className="text-lg font-medium text-muted-foreground sm:text-xl">$</span>
          <div className="relative inline-flex overflow-hidden tabular-nums">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={headlinePrice}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: reduce ? 0 : 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                className="block text-4xl font-semibold tracking-tight sm:text-5xl"
              >
                {headlinePrice}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-lg font-medium text-muted-foreground sm:text-xl">/mo</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Lowest revenue band — your price scales with earnings. One workspace.
        </p>

        <div
          className="mx-auto mt-8 flex max-w-md justify-center gap-2 sm:gap-3"
          role="radiogroup"
          aria-label="Base monthly price by platform"
        >
          {bases.map((b) => {
            const selected = displayed === b.key
            return (
              <button
                key={b.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onMouseEnter={() => setHovered(b.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(b.key)}
                onBlur={() => setHovered(null)}
                onClick={() => setActive(b.key)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border px-2 py-3 transition-colors sm:gap-3 sm:px-3 sm:py-4',
                  selected
                    ? 'border-foreground/15 bg-foreground/[0.04] shadow-sm'
                    : 'border-border/40 bg-transparent hover:border-border/60',
                )}
              >
                <span className="flex h-14 w-full min-w-0 shrink-0 items-center justify-center sm:h-16">
                  {b.key === 'ap' ? (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={antiPiracyPlatforms[antiPiracyIndex]?.name}
                        initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: reduce ? 0 : 0.22 }}
                        className="flex items-center justify-center"
                      >
                        {antiPiracyPlatforms[antiPiracyIndex]?.logoSrc ? (
                          <Image
                            src={antiPiracyPlatforms[antiPiracyIndex]!.logoSrc!}
                            alt={antiPiracyPlatforms[antiPiracyIndex]!.name}
                            width={200}
                            height={56}
                            className="mx-auto h-11 w-auto max-h-11 max-w-[min(100%,8.75rem)] object-contain object-center opacity-95 sm:h-12 sm:max-h-12 sm:max-w-[10rem]"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold tracking-tight text-foreground/90">
                            {antiPiracyPlatforms[antiPiracyIndex]?.short ??
                              antiPiracyPlatforms[antiPiracyIndex]?.name}
                          </span>
                        )}
                      </motion.span>
                    </AnimatePresence>
                  ) : b.logoSrc ? (
                    <Image
                      src={b.logoSrc}
                      alt=""
                      width={200}
                      height={56}
                      className="mx-auto h-11 w-auto max-h-11 max-w-[min(100%,8.75rem)] object-contain object-center opacity-95 sm:h-12 sm:max-h-12 sm:max-w-[10rem]"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold tracking-tight text-muted-foreground">AP</span>
                  )}
                </span>
                <span className="text-xs font-medium tabular-nums text-foreground/85 sm:text-sm">
                  ${b.price}
                </span>
                <span className="sr-only">{b.name}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className={cn(
              'cta-pricing-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-full px-10 text-sm font-medium',
              'ring-1 ring-black/5 transition-[transform,box-shadow] dark:ring-white/10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            See pricing
            <ArrowRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
