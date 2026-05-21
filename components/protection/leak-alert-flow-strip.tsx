'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeakAlert } from '@/lib/types'
import { isLeakDetectionTriaged, isLeakFlowClosed } from '@/lib/leaks/leak-alert-flow'

function StepBadge({ step, label, complete }: { step: number; label: string; complete: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          'flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums transition-colors',
          complete
            ? 'border-primary/50 bg-primary/12 text-primary'
            : 'border-border/55 bg-background/25 text-muted-foreground',
        )}
        aria-hidden
      >
        {complete ? <Check className="h-3 w-3" strokeWidth={2.5} /> : step}
      </span>
      <span className={cn('text-[11px] leading-none', complete ? 'text-foreground/88' : 'text-muted-foreground')}>
        {label}
      </span>
    </li>
  )
}

/** Three beats: link opened (local) → triage outcome set → case / pipeline closed. */
export function LeakAlertFlowStrip({ alert, linkOpened }: { alert: LeakAlert; linkOpened: boolean }) {
  const triaged = isLeakDetectionTriaged(alert.status)
  const closed = isLeakFlowClosed(alert.user_case_status, alert.status)

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Leak flow</p>
      <ol
        className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-5"
        aria-label="Progress: link opened, triage complete, case closed"
      >
        <StepBadge step={1} label="Opened" complete={linkOpened} />
        <span className="hidden h-px w-4 bg-border/45 sm:block" aria-hidden />
        <StepBadge step={2} label="Triage" complete={triaged} />
        <span className="hidden h-px w-4 bg-border/45 sm:block" aria-hidden />
        <StepBadge step={3} label="Closed" complete={closed} />
      </ol>
    </div>
  )
}
