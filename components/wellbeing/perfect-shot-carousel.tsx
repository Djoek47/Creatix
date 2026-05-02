'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PerfectShotDay } from '@/lib/wellbeing/types'

export function PerfectShotCarousel({ days }: { days: PerfectShotDay[] }) {
  const t = useTranslations('wellbeing.cards')
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">{t('perfectShot')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {days.map((day) => (
            <article key={day.date} className="min-w-[14rem] max-w-[14rem] rounded-xl border border-border/60 bg-background/70 p-3">
              <div className={`mb-2 h-14 rounded-lg bg-gradient-to-r ${day.skyGradient}`} />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{day.dayLabel}</p>
                <p className="text-sm font-semibold">{day.score}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Best moment: {day.bestWindowStart} - {day.bestWindowEnd}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{day.reason}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
