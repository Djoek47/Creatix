'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  PRICING_HERO_PLATFORM_CYCLE,
  PRICING_HERO_PLATFORM_CYCLE_MS,
} from '@/lib/marketing/pricing-cycle-platform-marks'

function LogoNamePair({ name, logoSrc }: { name: string; logoSrc: string }) {
  return (
    <>
      <Image
        src={logoSrc}
        alt=""
        width={200}
        height={56}
        className="h-9 w-auto max-w-[5.75rem] shrink-0 object-contain object-center opacity-95 sm:h-10 sm:max-w-[6.75rem]"
      />
      <span className="min-w-0 max-w-[11rem] text-pretty text-left text-[0.8125rem] font-medium leading-tight tracking-[-0.02em] text-foreground/88 sm:max-w-none sm:text-[0.9375rem]">
        {name}
      </span>
    </>
  )
}

export function HomeHeroPricingPlatformCycle({
  ariaLabel,
  className,
}: {
  /** Describes the row for screen readers (e.g. translated “Pricing — multi-platform …”). */
  ariaLabel: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % PRICING_HERO_PLATFORM_CYCLE.length)
  }, [])

  useEffect(() => {
    const id = window.setInterval(advance, PRICING_HERO_PLATFORM_CYCLE_MS)
    return () => window.clearInterval(id)
  }, [advance])

  const active = PRICING_HERO_PLATFORM_CYCLE[index % PRICING_HERO_PLATFORM_CYCLE.length]!

  const rowClass =
    'flex w-full max-w-full items-center justify-center gap-2.5 sm:gap-3.5'

  return (
    <div className={className}>
      <p className="sr-only">{ariaLabel}</p>
      <div
        className="relative flex min-h-[2.75rem] w-full items-center justify-center sm:min-h-[3rem]"
        aria-hidden
      >
        {reduceMotion ? (
          <div key={active.id} className={rowClass}>
            <LogoNamePair name={active.name} logoSrc={active.logoSrc} />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 5, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={rowClass}
            >
              <LogoNamePair name={active.name} logoSrc={active.logoSrc} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
