'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { sereneEase } from '@/lib/wellbeing/motion'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import type { FlowStatePayload } from '@/lib/wellbeing/flow-state-ai'
import type { PulsePayload, PulseSeverity } from '@/lib/wellbeing/pulse-engine'

const stripTransition = { duration: 0.4, ease: sereneEase }

function severityLabel(s: PulseSeverity): string {
  if (s === 'steady') return 'Steady'
  if (s === 'attend') return 'Attend'
  return 'Intervene'
}

const MOOD: Record<FlowStatePayload['mood'], string> = {
  calm: 'Calm',
  creative: 'Creative',
  charged: 'Charged',
  fragile: 'Fragile',
  focused: 'Focused',
}

type Props = {
  pulse: PulsePayload | null
  pulseLoading: boolean
  insight: GlowInsightsPayload | null
  flow: FlowStatePayload | null
  flowUnavailable: boolean
  glowLoading: boolean
}

function Cell({
  kicker,
  main,
  sub,
  empty,
  delay = 0,
}: {
  kicker: string
  main: string
  sub?: string
  empty?: boolean
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...stripTransition, delay: reduce ? 0 : delay }}
      className={cn(
        'flex min-h-[5.5rem] flex-col justify-center rounded-2xl px-4 py-4',
        'bg-background/60 backdrop-blur-md',
        'border border-border/40 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]',
        empty && 'opacity-80',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{main}</p>
      {sub ? <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
    </motion.div>
  )
}

export function WellbeingStateStrip({
  pulse,
  pulseLoading,
  insight,
  flow,
  flowUnavailable,
  glowLoading,
}: Props) {
  const reduce = useReducedMotion()

  const pulseMain = pulse
    ? severityLabel(pulse.severity)
    : pulseLoading
      ? '…'
      : '—'
  const pulseSub = pulse
    ? 'Operational rhythm'
    : pulseLoading
      ? 'Sensing'
      : 'Signal paused'

  const flowMain = flow ? MOOD[flow.mood] : pulseLoading ? '…' : '—'
  const flowSub = flow
    ? `⚡ E ${Math.round(flow.energy)} · 🧘 S ${Math.round(flow.stress)} · 🎯 F ${Math.round(flow.focus)}`
    : pulseLoading
      ? 'Composing readout'
      : flowUnavailable
        ? 'Could not read activity right now'
        : '—'

  const glowNum = insight?.glowScore ?? pulse?.glowScore
  const glowMain = glowLoading && !insight ? '…' : typeof glowNum === 'number' ? String(glowNum) : '—'
  const glowSub = insight
    ? `${insight.nextGoldenHour.start}–${insight.nextGoldenHour.end} · in ${insight.nextGoldenHour.minutesUntil}m`
    : glowLoading
      ? 'Lighting model'
      : typeof glowNum === 'number'
        ? 'Ambient signal'
        : 'Open environment to personalize'

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      role="group"
      aria-label="At-a-glance well-being signals"
    >
      <Cell
        kicker="Pulse"
        main={pulseMain}
        sub={pulseSub}
        empty={!pulse && !pulseLoading}
        delay={0}
      />
      <Cell
        kicker="Flow"
        main={flowMain}
        sub={flowSub}
        empty={!flow && flowUnavailable}
        delay={reduce ? 0 : 0.04}
      />
      <Cell
        kicker="Glow"
        main={glowMain}
        sub={glowSub}
        empty={!insight && !glowLoading && typeof glowNum !== 'number'}
        delay={reduce ? 0 : 0.08}
      />
    </div>
  )
}
