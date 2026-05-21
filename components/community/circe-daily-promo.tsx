import Link from 'next/link'
import { Moon, ArrowUpRight } from 'lucide-react'
import { getCirceTipCount, getTodayCirceTip, getCirceTipIndexForToday } from '@/lib/community/circe-daily-tips'

/** Featured strip — today’s rotating insight; calm surface, separate from creator board. */
export function CirceDailyPromo() {
  const tip = getTodayCirceTip()
  const idx = getCirceTipIndexForToday()
  const total = getCirceTipCount()
  const n = total > 0 ? Math.min(idx + 1, total) : 1

  return (
    <section
      className="rounded-3xl border border-border/50 bg-card/55 p-6 shadow-none backdrop-blur-md sm:p-8 dark:bg-card/40"
      data-tour="community-circe-daily"
      aria-labelledby="circe-daily-heading"
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground ring-1 ring-border/50"
                aria-hidden
              >
                <Moon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p
                  id="circe-daily-heading"
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85"
                >
                  Circe daily
                </p>
              </div>
            </div>
            <p className="shrink-0 tabular-nums text-[13px] text-muted-foreground/90">
              {n} <span className="text-muted-foreground/60">/</span> {total || '—'}
            </p>
          </div>
          <div className="space-y-3 border-t border-border/40 pt-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">Today</p>
            <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">{tip.title}</h2>
            <p className="max-w-2xl text-[15px] leading-[1.55] text-muted-foreground/90">{tip.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:items-end sm:pt-1">
          <Link
            href="/dashboard/community/circe-daily"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/55 bg-muted/25 px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted/40 sm:min-w-[12rem]"
          >
            Archive
            <ArrowUpRight className="h-4 w-4 opacity-70" aria-hidden />
          </Link>
          <p className="max-w-[14rem] text-center text-[12px] leading-snug text-muted-foreground/75 sm:text-right">
            Full list, deep links, and today highlighted in context.
          </p>
        </div>
      </div>
    </section>
  )
}
