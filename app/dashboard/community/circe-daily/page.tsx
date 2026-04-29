import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CirceDailyScrollToTip } from '@/components/community/circe-daily-scroll-to-tip'
import {
  CIRCE_DAILY_TIPS,
  getCirceTipCount,
  getCirceTipIndexForToday,
  getTodayCirceTip,
  type CirceDailyTip,
} from '@/lib/community/circe-daily-tips'
import { cn } from '@/lib/utils'

function TipLink({ tip }: { tip: CirceDailyTip }) {
  if (!tip.link) return null
  const external = /^https?:\/\//i.test(tip.link.href)
  return (
    <Button variant="ghost" size="sm" className="mt-4 h-9 rounded-full px-3 text-[13px] font-medium text-foreground hover:bg-muted/50" asChild>
      <Link href={tip.link.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {tip.link.label}
        {external ? <ArrowUpRight className="ml-1 h-3.5 w-3.5 opacity-60" /> : null}
      </Link>
    </Button>
  )
}

export default function CirceDailyTipsPage() {
  const today = getTodayCirceTip()
  const todayIdx = getCirceTipIndexForToday()
  const total = getCirceTipCount()

  return (
    <div className="mx-auto max-w-2xl space-y-12 px-4 pb-20 pt-2 sm:px-6 sm:pt-4">
      <CirceDailyScrollToTip />

      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground/85">
        <Link
          href="/dashboard/community"
          className="inline-flex items-center gap-1.5 font-medium text-foreground/90 underline-offset-4 transition hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 opacity-70" aria-hidden />
          Suggestions
        </Link>
        <span className="text-border/80" aria-hidden>
          /
        </span>
        <span className="text-muted-foreground">Circe daily</span>
      </nav>

      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Archive</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-[2.125rem] sm:leading-tight">
          Research insights
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground/88">
          Forty rotating notes on how creator businesses behave. Today’s pick follows the calendar; brief toasts while you
          browse surface a random entry from the same set.
        </p>
      </header>

      <Card className="circe-tip-floating-card">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/40 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">Today (UTC)</p>
            <p className="tabular-nums text-[13px] text-muted-foreground/85">
              {todayIdx + 1} of {total}
            </p>
          </div>
          <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">{today.title}</h2>
          <p className="text-[15px] leading-[1.6] text-muted-foreground/90 whitespace-pre-wrap">{today.body}</p>
          <TipLink tip={today} />
        </CardContent>
      </Card>

      <section className="space-y-6" aria-labelledby="all-insights">
        <h2 id="all-insights" className="text-[15px] font-semibold tracking-tight text-foreground">
          All {total} insights
        </h2>
        <ol className="space-y-0 divide-y divide-border/45 rounded-2xl border border-border/45 bg-card/30">
          {CIRCE_DAILY_TIPS.map((tip, i) => {
            const isToday = i === todayIdx
            return (
              <li
                key={tip.id}
                id={`tip-${tip.id}`}
                className={cn('scroll-mt-28 px-5 py-6 sm:px-6', isToday && 'bg-muted/15')}
              >
                <p className="text-[12px] tabular-nums text-muted-foreground/75">
                  {i + 1}
                  <span className="text-muted-foreground/50"> / </span>
                  {total}
                  {isToday ? <span className="ml-2 font-medium text-foreground/80">· Today</span> : null}
                </p>
                <h3 className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-[17px]">{tip.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground/88 whitespace-pre-wrap">{tip.body}</p>
                <TipLink tip={tip} />
              </li>
            )
          })}
        </ol>
      </section>

      <p className="text-center text-[13px] text-muted-foreground/80">
        <Link href="/dashboard/guide#circe-daily-tips" className="font-medium text-foreground/85 underline-offset-4 hover:underline">
          Also in Guide
        </Link>
      </p>
    </div>
  )
}
