'use client'

import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { HomeHeroPricingPlatformCycle } from '@/components/marketing/home-hero-pricing-platform-cycle'

const EASE = [0.22, 1, 0.36, 1] as const

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

export function HomeHeroUpcoming({
  eyebrow,
  items,
  pricingCycleCaption,
  caption,
  linkLabel,
  expandAriaLabel,
  collapseAriaLabel,
}: {
  eyebrow: string
  items: readonly [string, string, string]
  /** Explains the storefront cycle (Protection / multi-platform context). */
  pricingCycleCaption: string
  caption: string
  linkLabel: string
  expandAriaLabel: string
  collapseAriaLabel: string
}) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const baseId = useId()
  const triggerId = `home-upcoming-trigger-${baseId}`
  const panelId = `home-upcoming-panel-${baseId}`

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: EASE }

  return (
    <div className="mt-8 w-full sm:mt-10">
      <motion.div
        className="mx-auto max-w-md"
        initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-48px' }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="overflow-hidden rounded-[1.25rem] border border-border/30 bg-card/[0.22] shadow-sm backdrop-blur-sm">
          <button
            type="button"
            id={triggerId}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? collapseAriaLabel : expandAriaLabel}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex w-full items-center justify-center gap-2.5 px-5 py-3.5 text-center transition-colors',
              'hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <span
              className={cn(
                'text-[0.6875rem] font-semibold uppercase tracking-[0.2em]',
                reduceMotion ? 'text-muted-foreground' : 'home-hero-upcoming-eyebrow',
              )}
            >
              {eyebrow}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none',
                open && 'rotate-180',
              )}
              aria-hidden
            />
          </button>

          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                key="panel"
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                transition={panelTransition}
                className="border-t border-border/25 px-6 pb-6 pt-1 sm:px-7 sm:pb-7"
              >
                {reduceMotion ? (
                  <ul className="divide-y divide-border/35">
                    <li className="py-3.5 text-center first:pt-2">
                      <HomeHeroPricingPlatformCycle ariaLabel={items[0]} />
                      <p className="mx-auto mt-2.5 max-w-[24rem] text-pretty text-center text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-xs">
                        {pricingCycleCaption}
                      </p>
                    </li>
                    <li className="py-3.5 text-center text-[0.9375rem] font-medium leading-snug tracking-[-0.012em] text-foreground/90">
                      {items[1]}
                    </li>
                    <li className="py-3.5 text-center text-[0.9375rem] font-medium leading-snug tracking-[-0.012em] text-foreground/90">
                      {items[2]}
                    </li>
                  </ul>
                ) : (
                  <motion.ul
                    className="divide-y divide-border/35"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
                    }}
                  >
                    <motion.li variants={rowVariants} className="py-3.5 text-center first:pt-2">
                      <HomeHeroPricingPlatformCycle ariaLabel={items[0]} />
                      <p className="mx-auto mt-2.5 max-w-[24rem] text-pretty text-center text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-xs">
                        {pricingCycleCaption}
                      </p>
                    </motion.li>
                    <motion.li
                      variants={rowVariants}
                      className="py-3.5 text-center text-[0.9375rem] font-medium leading-snug tracking-[-0.012em] text-foreground/90"
                    >
                      {items[1]}
                    </motion.li>
                    <motion.li
                      variants={rowVariants}
                      className="py-3.5 text-center text-[0.9375rem] font-medium leading-snug tracking-[-0.012em] text-foreground/90"
                    >
                      {items[2]}
                    </motion.li>
                  </motion.ul>
                )}

                <p className="mt-1 border-t border-border/25 pt-5 text-center text-[0.75rem] leading-relaxed text-muted-foreground sm:text-[0.8125rem]">
                  <span>{caption}</span>{' '}
                  <Link
                    href="/features"
                    className="font-medium text-foreground/75 underline decoration-border/55 underline-offset-[5px] transition-colors hover:text-foreground hover:decoration-primary/45"
                  >
                    {linkLabel}
                  </Link>
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
