'use client'

import { formatCountdownParts, useCountdownMs, useIntegrationCountdownEndMs } from '@/hooks/use-integration-countdown'

type Props = {
  className?: string
}

/** Same mono pill cluster as MarkIt “full in-app integration” teaser — keep styling in sync. */
export function IntegrationCountdownPills({ className }: Props) {
  const countdownEnd = useIntegrationCountdownEndMs()
  const countdownLeft = useCountdownMs(countdownEnd)
  const parts = formatCountdownParts(countdownLeft)

  return (
    <div
      className={className}
      role="timer"
      aria-live="polite"
      aria-label="Countdown to expanded in-app integration"
    >
      <div className="flex flex-wrap gap-1.5 font-mono text-[11px] tabular-nums text-foreground/90 sm:text-xs">
        <span className="rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 sm:px-2 sm:py-1">
          {parts.d}d
        </span>
        <span className="rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 sm:px-2 sm:py-1">
          {String(parts.h).padStart(2, '0')}h
        </span>
        <span className="rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 sm:px-2 sm:py-1">
          {String(parts.m).padStart(2, '0')}m
        </span>
        <span className="rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 sm:px-2 sm:py-1">
          {String(parts.s).padStart(2, '0')}s
        </span>
      </div>
    </div>
  )
}
