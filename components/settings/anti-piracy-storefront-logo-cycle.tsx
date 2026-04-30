'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE } from '@/lib/billing/clip-focus-addon-carousel'
import { BundledAntipiracyStorefrontLogoMark } from '@/components/billing/bundled-antipiracy-storefront-mark'

const ROTATE_MS = 2600

type CycleCtx = {
  activeIndex: number
}

const AntiPiracyStorefrontCycleContext = createContext<CycleCtx | null>(null)

export function AntiPiracyStorefrontCycleProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const len = BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE.length
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % len)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [len, reduceMotion])

  const value = useMemo(() => ({ activeIndex }), [activeIndex])

  return (
    <AntiPiracyStorefrontCycleContext.Provider value={value}>{children}</AntiPiracyStorefrontCycleContext.Provider>
  )
}

function useAntiPiracyStorefrontCycle(): CycleCtx {
  const ctx = useContext(AntiPiracyStorefrontCycleContext)
  if (!ctx) {
    throw new Error(
      'Anti-piracy storefront cycle components must be used inside AntiPiracyStorefrontCycleProvider',
    )
  }
  return ctx
}

/** Cycling storefront logos on the Anti‑piracy billing row (one brand at a time). */
export function AntiPiracyStorefrontLogoCycle({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const { activeIndex } = useAntiPiracyStorefrontCycle()
  const active = BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE[activeIndex % BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE.length]

  return (
    <div className={cn('relative flex h-12 min-h-12 min-w-[8.5rem] shrink-0 items-center justify-start', className)}>
      <motion.div
        key={active.id}
        className="flex h-12 w-full max-w-[10.5rem] items-center justify-start"
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <BundledAntipiracyStorefrontLogoMark slide={active} frame="billingStrip" />
      </motion.div>
    </div>
  )
}

/** Paragraph synced to `AntiPiracyStorefrontLogoCycle` — same interval / label as the logo. */
export function AntiPiracyBundledWorkspaceCaption({
  creditsPerCycle,
  className,
}: {
  creditsPerCycle: number
  className?: string
}) {
  const { activeIndex } = useAntiPiracyStorefrontCycle()
  const slide =
    BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE[activeIndex % BUNDLED_ANTIPIRACY_STOREFRONT_CYCLE.length]
  const label = slide.displayLabel

  return (
    <p
      className={cn('max-w-md text-[13px] leading-relaxed text-muted-foreground', className)}
      aria-live="polite"
    >
      {label} · Bundled workspace ·{' '}
      <span className="tabular-nums text-foreground/90">{creditsPerCycle.toLocaleString()}</span> credits per cycle.
    </p>
  )
}
