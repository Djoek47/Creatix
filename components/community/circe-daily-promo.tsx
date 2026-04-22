import Link from 'next/link'
import { Moon, ChevronRight, Stars } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCirceTipCount, getTodayCirceTip, getCirceTipIndexForToday } from '@/lib/community/circe-daily-tips'

/** Featured strip — today’s rotating Circe tip, separate from the creator board. */
export function CirceDailyPromo() {
  const tip = getTodayCirceTip()
  const idx = getCirceTipIndexForToday()
  const total = getCirceTipCount()
  const n = total > 0 ? Math.min(idx + 1, total) : 1

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-circe/30 bg-gradient-to-b from-circe/[0.12] via-card to-card p-0 shadow-md ring-1 ring-circe/10"
      data-tour="community-circe-daily"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl transition-opacity group-hover:opacity-90"
        aria-hidden
      />
      <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-circe via-amber-500/80 to-circe/40" />
      <div className="relative p-5 sm:p-6 pl-6 sm:pl-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-circe/20 ring-1 ring-circe/30">
              <Moon className="h-5 w-5 text-circe" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-circe/90">Circe daily</p>
              <p className="text-sm font-semibold text-foreground">A bit of product moonlight</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-2.5 py-0.5 text-[10px] text-muted-foreground">
            <Stars className="h-3 w-3 text-amber-500/90" />
            Day {n} of {total || '—'}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Rotates with the clock — not the same as creator tips below.</p>
        <div className="mt-4 space-y-2 rounded-xl border border-border/50 bg-background/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="text-base font-semibold leading-snug text-foreground">{tip.title}</p>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
        </div>
        <Button
          asChild
          className="mt-4 w-full gap-2 border-circe/40 bg-circe/15 text-foreground hover:bg-circe/25 sm:w-auto"
          variant="outline"
        >
          <Link href="/dashboard/community/circe-daily">
            Full archive &amp; today&apos;s entry
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
