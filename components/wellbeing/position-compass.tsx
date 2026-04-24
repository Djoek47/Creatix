'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PositioningHints } from '@/lib/wellbeing/types'

export function PositionCompass({ positioning }: { positioning: PositioningHints }) {
  const rotation = positioning.azimuthDeg
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">Positioning Awareness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-full border border-border/70 bg-background/70">
            <div className="absolute inset-2 rounded-full border border-dashed border-border/60" />
            <div
              className="absolute left-1/2 top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-full origin-bottom bg-gradient-to-t from-violet-500 to-amber-400"
              style={{ transform: `translate(-50%, -100%) rotate(${rotation}deg)` }}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Best facing direction</p>
            <p className="text-lg font-semibold">{positioning.bestFacingDirection}</p>
            <p className="text-xs text-muted-foreground">Azimuth {positioning.azimuthDeg}deg</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {positioning.environments.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
