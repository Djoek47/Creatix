'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'

export function GoldenHourTimeline({ timeline }: { timeline: GlowInsightsPayload['timeline'] }) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">Daylight Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {timeline.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{step.label}</p>
                <p className="text-sm font-medium">{step.time}</p>
              </div>
              {idx < timeline.length - 1 ? (
                <span className="h-px w-5 bg-border/70" />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
