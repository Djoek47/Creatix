'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CircleHelp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { sereneEase } from '@/lib/wellbeing/motion'
import { cn } from '@/lib/utils'
import type { FlowStatePayload } from '@/lib/wellbeing/flow-state-ai'

const MOOD_META: Record<FlowStatePayload['mood'], { label: string; emoji: string }> = {
  calm: { label: 'Calm', emoji: '😌' },
  creative: { label: 'Creative', emoji: '🎨' },
  charged: { label: 'Charged', emoji: '⚡' },
  fragile: { label: 'Fragile', emoji: '🫧' },
  focused: { label: 'Focused', emoji: '🎯' },
}

type Props = {
  flowState: FlowStatePayload | null
  /** Set when page finished loading but flow-state could not be computed */
  flowUnavailable?: boolean
  /** Flatter surface when nested in the well-being bento */
  embedded?: boolean
}

function FlowMeters({
  flowState,
  flowUnavailable,
  meta,
  summary,
  embedded,
}: {
  flowState: FlowStatePayload | null
  flowUnavailable: boolean
  meta: { label: string; emoji: string } | null
  summary: string | null
  embedded: boolean
}) {
  if (!flowState) {
    return (
      <p className="text-sm text-muted-foreground">
        {flowUnavailable ? 'Unavailable' : 'Reading…'}
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <motion.span
          layout
          className="inline-flex items-center gap-2 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3.5 py-1.5 text-sm font-medium text-foreground"
          transition={{ duration: 0.2, ease: sereneEase }}
        >
          {embedded ? null : (
            <span className="text-base leading-none" aria-hidden>
              {meta?.emoji}
            </span>
          )}
          {meta?.label}
        </motion.span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        <ReadoutMeter embedded={embedded} label="Energy" value={flowState.energy} accent="bg-emerald-500/65" />
        <ReadoutMeter embedded={embedded} label="Stress" value={flowState.stress} accent="bg-amber-500/60" />
        <ReadoutMeter embedded={embedded} label="Focus" value={flowState.focus} accent="bg-violet-500/60" />
      </div>

      {!embedded ? (
        <div className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="text-[13px] leading-relaxed">{flowState.rationale}</p>
          <p className="text-foreground/85">{flowState.goalAlignment}</p>
          {summary ? <p className="text-[11px] tabular-nums text-muted-foreground/80">{summary}</p> : null}
        </div>
      ) : null}
    </>
  )
}

function ReadoutMeter({
  label,
  value,
  accent,
  embedded,
}: {
  label: string
  value: number
  accent: string
  embedded?: boolean
}) {
  const v = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div
      className={cn(
        'rounded-xl border bg-background/50 p-3',
        embedded ? 'border-border/25 bg-background/30 p-2.5' : 'border-border/50',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between text-[11px] sm:text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium text-foreground">{v}</span>
      </div>
      <div
        className={cn(
          'h-2 w-full overflow-hidden rounded-full bg-foreground/10',
          embedded && 'h-1.5 bg-foreground/8',
        )}
      >
        <motion.div
          className={['h-full rounded-full', accent].join(' ')}
          initial={false}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.35, ease: sereneEase }}
        />
      </div>
    </div>
  )
}

export function MoodConstellation({ flowState, flowUnavailable = false, embedded = false }: Props) {
  const meta = flowState ? MOOD_META[flowState.mood] : null
  const summary = useMemo(() => {
    if (!flowState) return null
    return `Mood: ${flowState.mood}. Energy ${flowState.energy}, stress ${flowState.stress}, focus ${flowState.focus}.`
  }, [flowState])

  if (embedded) {
    return (
      <div className="rounded-2xl border border-border/30 bg-background/40 px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Flow</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground [&_svg]:text-current"
                  aria-label="How Flow is inferred"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-[19rem] text-sm leading-relaxed" align="start" sideOffset={6}>
                <p className="text-muted-foreground leading-relaxed">
                  Inbox, protocols, queue, goals, glow, dashboard activity · UTC · review-only—you don&apos;t type these scores.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          {flowState ? (
            <Badge variant="secondary" className="shrink-0 rounded-full text-[10px] font-medium uppercase tracking-wide">
              {flowState.source === 'ai' ? 'Model' : 'Heuristic'}
            </Badge>
          ) : null}
        </div>
        <div className="mt-5 space-y-6">
          <FlowMeters
            embedded
            flowState={flowState}
            flowUnavailable={flowUnavailable}
            meta={meta}
            summary={summary}
          />
        </div>
      </div>
    )
  }

  return (
    <Card className="rounded-2xl border border-border/40 bg-card/35 shadow-none backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">Flow state</CardTitle>
            <CardDescription className="text-sm">
              Inbox, queues, goals, glow, light engagement · UTC · review-only
            </CardDescription>
          </div>
          {flowState ? (
            <Badge variant="secondary" className="shrink-0 text-[10px] font-medium uppercase tracking-wide">
              {flowState.source === 'ai' ? 'Model' : 'Fallback'}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FlowMeters
          embedded={false}
          flowState={flowState}
          flowUnavailable={flowUnavailable}
          meta={meta}
          summary={summary}
        />
      </CardContent>
    </Card>
  )
}
