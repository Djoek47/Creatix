import Link from 'next/link'
import { Sparkles, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CirceDailyScrollToTip } from '@/components/community/circe-daily-scroll-to-tip'
import {
  CIRCE_DAILY_TIPS,
  getCirceTipCount,
  getCirceTipIndexForToday,
  getTodayCirceTip,
  type CirceDailyTip,
} from '@/lib/community/circe-daily-tips'

function TipLink({ tip }: { tip: CirceDailyTip }) {
  if (!tip.link) return null
  const external = /^https?:\/\//i.test(tip.link.href)
  return (
    <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-circe/40 text-circe-light" asChild>
      <Link href={tip.link.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {tip.link.label}
        {external && <ExternalLink className="h-3 w-3 opacity-70" />}
      </Link>
    </Button>
  )
}

export default function CirceDailyTipsPage() {
  const today = getTodayCirceTip()
  const todayIdx = getCirceTipIndexForToday()
  const total = getCirceTipCount()

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 pb-14 sm:p-6">
      <CirceDailyScrollToTip />
      <p className="text-sm text-muted-foreground leading-relaxed">
        One highlighted insight each day; full archive below.{' '}
        <Link href="/dashboard/community" className="text-primary underline hover:no-underline">
          Community board
        </Link>
        .
      </p>

      <Card className="circe-tip-floating-card text-card-foreground shadow-2xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-serif text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary/90">
                Today&apos;s insight
              </p>
              <CardTitle className="mt-0.5 text-lg font-semibold leading-tight">Circe daily</CardTitle>
              <CardDescription>Insight {todayIdx + 1} of {total} — rotates daily</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{today.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{today.body}</p>
          <TipLink tip={today} />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">All insights</h2>
        <ul className="space-y-4">
          {CIRCE_DAILY_TIPS.map((tip, i) => (
            <li key={tip.id} id={`tip-${tip.id}`} className="scroll-mt-24">
              <Card className={i === todayIdx ? 'ring-1 ring-circe/40' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-normal text-muted-foreground">
                    Insight {i + 1} of {total}
                  </CardDescription>
                  <CardTitle className="text-base pt-1">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{tip.body}</p>
                  <TipLink tip={tip} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/dashboard/community" className="text-primary underline hover:no-underline">
          ← Back to Community
        </Link>
        {' · '}
        <Link href="/dashboard/guide#circe-daily-tips" className="text-primary underline hover:no-underline">
          Mentioned in Guide
        </Link>
      </p>
    </div>
  )
}
