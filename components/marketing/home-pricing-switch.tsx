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

type BaseKey = 'of' | 'fl' | 'mv'

type BaseOption = {
  key: BaseKey
  name: string
  price: number
  logoSrc: string | null
}

export function HomePricingSwitch() {
  const { mode } = useMarketingMode()
  const reduce = useReducedMotion()
  const tier0 = PRICING_TIERS[0]!

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
        key: 'mv',
        name: 'ManyVids',
        price: tier0.prices.mv,
        logoSrc: null,
      },
    ],
    [tier0],
  )

  const [active, setActive] = useState<BaseKey>('of')
  const [hovered, setHovered] = useState<BaseKey | null>(null)

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
                  {b.logoSrc ? (
                    <Image
                      src={b.logoSrc}
                      alt=""
                      width={28}
                      height={28}
                      className="object-contain opacity-90"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold tracking-tight text-muted-foreground">MV</span>
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
        <p className="mt-3 text-[11px] text-muted-foreground/80">Hover a platform. Or wait — it cycles every ten seconds.</p>

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
