'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageSquare, Mic, Moon, Shield, Sparkles, Sun, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const FEATURE_ROTATE_MS = 5000

const FEATURES: { icon: LucideIcon; text: string; color: string }[] = [
  { icon: Moon, text: 'Circe — retention, protection & analytics', color: 'text-circe' },
  { icon: Sun, text: 'Venus — fans, mentions & Fan Atlas', color: 'text-venus' },
  { icon: Mic, text: 'Divine Manager — voice & chat', color: 'text-primary' },
  { icon: MessageSquare, text: 'Unified inbox — OnlyFans & Fansly', color: 'text-venus' },
  { icon: Shield, text: 'Leak alerts & DMCA drafts (you approve)', color: 'text-circe' },
  { icon: Sparkles, text: 'AI Studio — tools library & credits', color: 'text-primary' },
]

export function SignUpFeatureShowcase() {
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % FEATURES.length)
    }, FEATURE_ROTATE_MS)
    return () => window.clearTimeout(id)
  }, [index])

  const current = FEATURES[index]
  const Icon = current.icon
  const transition = reduceMotion
    ? { duration: 0.15 }
    : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <div className="relative z-10 hidden min-h-0 flex-1 flex-col justify-center overflow-hidden border-l border-white/10 px-6 py-14 sm:px-10 lg:flex">
      {/* Dark tint + frosted glass over shared scenic; constellations sit above in next block */}
      <div
        className={cn(
          /* Clear “lens”: light tint, almost no blur so constellations stay sharp */
          'absolute inset-0 z-[1] bg-background/10 backdrop-blur-[2px] dark:bg-black/25 dark:backdrop-blur-[3px]',
          'motion-reduce:backdrop-blur-none',
        )}
        aria-hidden
      />

      <div
        className={cn(
          'pointer-events-none absolute -left-[10%] top-[6%] z-[2] h-[38vh] w-[38vh] opacity-90',
          !reduceMotion && 'motion-safe:animate-[sign-up-constell-glow_5.4s_ease-in-out_infinite]',
        )}
        aria-hidden
      >
        <svg viewBox="0 0 200 200" className="h-full w-full text-violet-300/95">
          <path
            d="M24 128 64 78 102 98 144 40 170 86"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="opacity-80"
          />
          <circle cx="24" cy="128" r="3.2" className="fill-amber-300" />
          <circle cx="64" cy="78" r="2.5" className="fill-white" />
          <circle cx="102" cy="98" r="2.5" className="fill-violet-200" />
          <circle cx="144" cy="40" r="3" className="fill-amber-200" />
          <circle cx="170" cy="86" r="2.5" className="fill-violet-100" />
        </svg>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute -right-[8%] bottom-[8%] z-[2] h-[40vh] w-[40vh] opacity-90',
          !reduceMotion && 'motion-safe:animate-[sign-up-constell-glow_6.2s_ease-in-out_infinite_reverse]',
        )}
        aria-hidden
      >
        <svg viewBox="0 0 220 220" className="h-full w-full text-amber-200/90">
          <path
            d="M40 64 90 36 128 88 176 48 200 100 160 150 100 120 64 170"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            className="opacity-80"
          />
          <circle cx="40" cy="64" r="2.8" className="fill-violet-300" />
          <circle cx="90" cy="36" r="2.5" className="fill-amber-200" />
          <circle cx="128" cy="88" r="2.5" className="fill-white" />
          <circle cx="176" cy="48" r="2.8" className="fill-violet-200" />
          <circle cx="200" cy="100" r="2.5" className="fill-amber-100" />
          <circle cx="160" cy="150" r="2.5" className="fill-violet-100" />
          <circle cx="100" cy="120" r="3" className="fill-amber-300" />
          <circle cx="64" cy="170" r="2.5" className="fill-white" />
        </svg>
      </div>

      <div className="relative z-[3] mx-auto w-full max-w-md">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          Retention and reach, <br />
          <span className="text-primary">one integrated stack</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Circe handles retention, protection, and analytics. Venus helps you grow audience and stay on top of fan
          conversations—side by side in one workspace.
        </p>

        <div className="relative mt-10">
          <div
            key={index}
            className={cn(
              'pointer-events-none absolute -inset-[2px] z-0 rounded-2xl',
              !reduceMotion && 'sign-up-feature-frame-animated',
            )}
            aria-hidden
          />
          <div className="relative z-10 overflow-hidden rounded-2xl border border-white/15 bg-card/50 shadow-lg backdrop-blur-sm">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={current.text}
                role="status"
                aria-live="polite"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={transition}
                className="flex flex-col items-center gap-5 px-6 py-10 text-center sm:px-8"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 shadow-[0_0_24px_rgba(168,85,247,0.35),0_0_18px_rgba(251,191,36,0.25)]">
                  <Icon className={cn('h-8 w-8', current.color)} aria-hidden />
                </div>
                <p className="text-balance text-base font-medium leading-snug text-foreground sm:text-lg">
                  {current.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Feature progress">
          {FEATURES.map((f, j) => (
            <button
              key={f.text}
              type="button"
              onClick={() => setIndex(j)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                j === index ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/35 hover:bg-muted-foreground/55',
              )}
              aria-label={`Show feature ${j + 1}`}
              aria-pressed={j === index}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Features rotate about every {Math.round(FEATURE_ROTATE_MS / 1000)}s — tap a dot to jump.
        </p>
      </div>
    </div>
  )
}
