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
  className?: string
}

export function HomePricingSwitch() {
  const { mode } = useMarketingMode()
  const reduce = useReducedMotion()
  const tier0 = PRICING_TIERS[0]!
  const antiPiracyPlatforms = useMemo<RotatingPlatformMark[]>(
    () => [
      { name: 'MYM', logoSrc: '/mym-logo.png', className: 'h-6 w-11' },
      { name: 'Clips4Sale', logoSrc: '/clips4sale-logo.png', className: 'h-6 w-10' },
      { name: 'LoyalFans', logoSrc: '/loyalfans-logo.svg', className: 'h-6 w-10' },
      { name: 'Fanvue', logoSrc: '/fanvue-logo.png', className: 'h-6 w-6' },
    ],
    [],
  )

  const bases = useMemo<BaseOption[]>(
    () => [
      {
        key: 'of',
        name: 'OnlyFans',
        price: tier0.prices.of,
        logoSrc: '/onlyfans-logo.png',
      },
      {
        key: 'fl',
        name: 'Fansly',
        price: tier0.prices.fl,
        logoSrc: '/fansly-logo.png',
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
                  'flex flex-1 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-colors sm:px-3 sm:py-4',
                  selected
                    ? 'border-foreground/15 bg-foreground/[0.04] shadow-sm'
                    : 'border-border/40 bg-transparent hover:border-border/60',
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
                  {b.key === 'ap' ? (
                    <span className="relative inline-flex h-8 w-14 items-center justify-center rounded-md border border-amber-400/35 bg-gradient-to-br from-amber-400/15 via-primary/10 to-fuchsia-400/12 p-1 shadow-[0_0_22px_-12px_rgba(251,191,36,0.85)] sm:h-9 sm:w-16">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={antiPiracyPlatforms[antiPiracyIndex]?.name}
                          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.92 }}
                          transition={{ duration: reduce ? 0 : 0.22 }}
                          className={cn(
                            'flex items-center justify-center text-[10px] font-semibold tracking-tight text-foreground/95',
                            antiPiracyPlatforms[antiPiracyIndex]?.className ?? 'h-6 w-10',
                          )}
                        >
                          {antiPiracyPlatforms[antiPiracyIndex]?.logoSrc ? (
                            <Image
                              src={antiPiracyPlatforms[antiPiracyIndex]!.logoSrc!}
                              alt={antiPiracyPlatforms[antiPiracyIndex]!.name}
                              width={56}
                              height={28}
                              className="h-full w-full rounded-sm object-contain"
                            />
                          ) : (
                            antiPiracyPlatforms[antiPiracyIndex]?.short ?? antiPiracyPlatforms[antiPiracyIndex]?.name
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  ) : b.logoSrc ? (
                    <Image
                      src={b.logoSrc}
                      alt=""
                      width={28}
                      height={28}
                      className="object-contain opacity-90"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold tracking-tight text-muted-foreground">AP</span>
                  )}
                </span>
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
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
