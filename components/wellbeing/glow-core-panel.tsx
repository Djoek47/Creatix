'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'

type Props = {
  insight: GlowInsightsPayload
  /** Sits inside a parent surface — fewer borders, calmer type */
  embedded?: boolean
}

export function GlowCorePanel({ insight, embedded = false }: Props) {
  const t = useTranslations('wellbeing.cards')
  if (embedded) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground normal-case">{t('sunGlowTitle')}</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {insight.glowScore}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full border-amber-500/20 bg-amber-500/10 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200"
          >
            {insight.nextGoldenHour.start}–{insight.nextGoldenHour.end}
          </Badge>
        </div>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Next golden hour in{' '}
          <span className="font-medium text-foreground">{insight.nextGoldenHour.minutesUntil} min</span>
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{insight.insightSentence}</p>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'border-border/40 bg-card/50 shadow-none backdrop-blur-md',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]',
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">Sun glow</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Golden hour and light quality for your next shoot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t('score')}</p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{insight.glowScore}</p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          >
            {insight.nextGoldenHour.start} – {insight.nextGoldenHour.end}
          </Badge>
        </div>
        <div className="rounded-2xl border border-border/30 bg-background/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Next window in <span className="font-medium text-foreground">{insight.nextGoldenHour.minutesUntil} min</span>.
          </p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{insight.insightSentence}</p>
      </CardContent>
    </Card>
  )
}
