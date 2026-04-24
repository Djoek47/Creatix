'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'

export function GlowCorePanel({ insight }: { insight: GlowInsightsPayload }) {
  return (
    <Card className="border-border/60 bg-card/85 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">Glow Core</CardTitle>
        <CardDescription>
          Golden hour and atmospheric quality for high-conversion visual content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Glow score</p>
            <p className="text-4xl font-semibold">{insight.glowScore}</p>
          </div>
          <Badge className="bg-amber-400/20 text-amber-700 dark:text-amber-300">
            {insight.nextGoldenHour.start} - {insight.nextGoldenHour.end}
          </Badge>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/70 p-3">
          <p className="text-sm text-muted-foreground">
            Next golden hour starts in <span className="font-medium text-foreground">{insight.nextGoldenHour.minutesUntil} min</span>.
          </p>
        </div>
        <p className="text-sm">{insight.insightSentence}</p>
      </CardContent>
    </Card>
  )
}
