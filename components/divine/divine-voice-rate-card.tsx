'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DIVINE_VOICE_CREDITS_PER_MINUTE,
  divineVoiceCreditsPerMinute,
  formatDivineVoiceCreditsPerSecond,
} from '@/lib/billing/credit-economics'

const DIVINE_VOICE_SESSION_PRESETS_MIN = [5, 15, 30] as const

/** Live voice credit rate (launcher popover + Divine Manager Voice). */
export function DivineVoiceRateCard({ className }: { className?: string }) {
  const [ratesExpanded, setRatesExpanded] = useState(false)
  const perMinCredits = divineVoiceCreditsPerMinute()
  const perHourCredits = DIVINE_VOICE_CREDITS_PER_MINUTE * 60
  const perSecLabel = formatDivineVoiceCreditsPerSecond()

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.1] via-muted/[0.28] to-amber-400/[0.12] px-3.5 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)] dark:border-violet-400/20 dark:from-violet-500/[0.18] dark:via-white/[0.04] dark:to-amber-400/[0.12] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]',
        className,
      )}
      aria-label="Divine voice credit rate"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl motion-safe:animate-pulse dark:bg-violet-400/25"
        style={{ animationDuration: '4.5s' }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600/85 dark:text-violet-300/85">
              Live rate
            </p>
            <Badge
              variant="secondary"
              className="h-5 border border-amber-500/25 bg-amber-500/15 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100"
            >
              Beta
            </Badge>
          </div>
          <p className="mt-1.5 whitespace-nowrap tabular-nums">
            <span className="bg-gradient-to-br from-violet-700 to-violet-500 bg-clip-text text-[1.625rem] font-semibold tracking-[-0.03em] text-transparent dark:from-violet-200 dark:to-fuchsia-200">
              {perSecLabel}
            </span>
            <span className="ml-2 text-[13px] font-medium text-muted-foreground">credits / sec</span>
          </p>
        </div>
        <div className="text-right tabular-nums">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700/80 dark:text-amber-200/75">
            One minute
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground">{perMinCredits} credits</p>
        </div>
      </div>

      <button
        type="button"
        className="relative mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35 dark:hover:bg-white/[0.06]"
        aria-expanded={ratesExpanded}
        onClick={() => setRatesExpanded((v) => !v)}
      >
        {ratesExpanded ? (
          <>
            Hide hourly and sessions
            <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </>
        ) : (
          <>
            Hourly and session rates
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </>
        )}
      </button>

      {ratesExpanded ? (
        <div className="relative mt-2 space-y-3 border-t border-violet-500/15 pt-3 dark:border-white/[0.08]">
          <div className="tabular-nums">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700/80 dark:text-amber-200/75">
              One hour
            </p>
            <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground">{perHourCredits} credits</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            While you are connected, time ticks continuously. Tool calls may add separate debits.
          </p>
          <ul className="space-y-1.5" role="list">
            {DIVINE_VOICE_SESSION_PRESETS_MIN.map((min) => {
              const credits = DIVINE_VOICE_CREDITS_PER_MINUTE * min
              return (
                <li key={min} className="flex items-center justify-between gap-3 text-[13px] tabular-nums">
                  <span className="text-muted-foreground">{min} min session</span>
                  <span className="min-w-0 truncate text-right font-medium text-foreground/90">{credits} credits</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
