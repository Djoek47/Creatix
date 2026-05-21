'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import { HeartPulse, CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { sereneEase } from '@/lib/wellbeing/motion'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import type { FlowStatePayload } from '@/lib/wellbeing/flow-state-ai'
import type { PulsePayload, PulseSeverity } from '@/lib/wellbeing/pulse-engine'

const stripTransition = { duration: 0.4, ease: sereneEase }

const stripHelpPopoverClass =
  'w-[min(15rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-xl border-border/35 px-3 py-3 text-[13px] leading-snug shadow-md'

const pulseStripLabelClass =
  'truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground'

function severityLabel(s: PulseSeverity, t: (key: string) => string): string {
  if (s === 'steady') return t('severitySteady')
  if (s === 'attend') return t('severityAttend')
  return t('severityIntervene')
}

function pulseHeartbeatIconClasses(
  pulse: PulsePayload | null,
  pulseLoading: boolean,
  prefersReducedMotion: boolean,
): string {
  const paused = !pulseLoading && !pulse
  if (paused) {
    return 'size-4 shrink-0 text-muted-foreground/65'
  }
  if (prefersReducedMotion) {
    return cn(
      'size-4 shrink-0 opacity-95',
      pulse?.severity === 'steady' && 'text-emerald-600 dark:text-emerald-300',
      pulse?.severity === 'attend' && 'text-amber-600 dark:text-amber-200',
      pulse?.severity === 'intervene' && 'text-rose-600 dark:text-rose-300',
      !pulse?.severity && 'text-amber-600 dark:text-amber-200',
    )
  }
  if (!pulse) {
    return 'header-wellbeing-heartbeat size-4 shrink-0'
  }
  return cn(
    'header-wellbeing-heartbeat size-4 shrink-0',
    pulse.severity === 'steady' && 'header-wellbeing-pulse-steady',
    pulse.severity === 'attend' && 'header-wellbeing-pulse-attend',
    pulse.severity === 'intervene' && 'header-wellbeing-pulse-intervene',
  )
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
  title,
  kickerNormalCase = false,
  help,
  heroSub = false,
}: {
  kicker: string
  main?: string
  sub?: string
  empty?: boolean
  delay?: number
  title?: string
  kickerNormalCase?: boolean
  help?: {
    ariaLabel: string
    title: string
    description: ReactNode
  }
  heroSub?: boolean
}) {
  const reduce = useReducedMotion()
  const kickerClass = cn(
    'text-[10px] font-medium tracking-[0.16em] text-muted-foreground',
    kickerNormalCase ? 'normal-case' : 'uppercase',
  )

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...stripTransition, delay: reduce ? 0 : delay }}
      title={title}
      className={cn(
        'flex min-h-[5.5rem] flex-col justify-center rounded-2xl px-4 py-4',
        'bg-background/60 backdrop-blur-md',
        'border border-border/40 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]',
        empty && 'opacity-80',
      )}
    >
      {help ? (
        <div className="flex items-start justify-between gap-2">
          <p className={cn(kickerClass, 'min-w-0 flex-1')}>{kicker}</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground [&_svg]:text-current"
                aria-label={help.ariaLabel}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className={stripHelpPopoverClass} align="end" sideOffset={6}>
              <p className="text-[13px] font-semibold tracking-tight text-foreground">{help.title}</p>
              <div className="mt-2 text-muted-foreground">{help.description}</div>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <p className={kickerClass}>{kicker}</p>
      )}
      {main != null && main !== '' ? (
        <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">{main}</p>
      ) : null}
      {sub ? (
        <p
          className={cn(
            heroSub
              ? 'mt-2 select-none text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl sm:leading-snug'
              : 'mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground',
          )}
        >
          {sub}
        </p>
      ) : null}
    </motion.div>
  )
}

function PulseStripCell({
  main,
  sub,
  pulse,
  pulseLoading,
  empty,
  delay,
}: {
  main: string
  sub?: string
  pulse: PulsePayload | null
  pulseLoading: boolean
  empty: boolean
  delay: number
}) {
  const reduce = useReducedMotion()
  const t = useTranslations('wellbeing.stateStrip')
  const live = pulseLoading || !!pulse
  const hbClasses = pulseHeartbeatIconClasses(pulse, pulseLoading, !!reduce)

  const pulseHelpBody = t.rich('pulseHelpRich', {
    steady: (chunks) => <span className="font-medium text-foreground/88">{chunks}</span>,
    attend: (chunks) => <span className="font-medium text-foreground/88">{chunks}</span>,
    intervene: (chunks) => <span className="font-medium text-foreground/88">{chunks}</span>,
  })

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...stripTransition, delay: reduce ? 0 : delay }}
      className={cn(
        'flex min-h-[5.5rem] flex-col justify-center rounded-2xl px-4 py-4',
        'backdrop-blur-md',
        'border shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]',
        live
          ? 'border-amber-500/35 bg-amber-500/[0.08] dark:border-amber-400/30 dark:bg-amber-400/[0.1]'
          : 'border-border/40 bg-background/60',
        empty && 'opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <HeartPulse className={hbClasses} aria-hidden />
          {live && !reduce ? (
            <motion.p
              className={pulseStripLabelClass}
              animate={{ opacity: [0.62, 1, 0.62] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {t('pulse')}
            </motion.p>
          ) : (
            <p className={pulseStripLabelClass}>{t('pulse')}</p>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground [&_svg]:text-current"
              aria-label={t('pulseHelpAria')}
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={stripHelpPopoverClass} align="end" sideOffset={6}>
            <p className="text-[13px] font-semibold tracking-tight text-foreground">{t('pulse')}</p>
            <p className="mt-2 text-muted-foreground">{pulseHelpBody}</p>
            <p className="mt-2 text-[11px] leading-normal text-muted-foreground/75">{t('pulseHelpDisclaimer')}</p>
          </PopoverContent>
        </Popover>
      </div>
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
  const t = useTranslations('wellbeing.stateStrip')

  const pulseMain = pulse
    ? severityLabel(pulse.severity, t)
    : pulseLoading
      ? t('ellipsis')
      : t('dash')
  const pulseSub = pulse ? undefined : pulseLoading ? t('reading') : t('paused')

  const flowMain = flow ? undefined : pulseLoading ? t('ellipsis') : t('dash')
  const flowSub = flow
    ? `⚡ ${Math.round(flow.energy)} · 🧘 ${Math.round(flow.stress)} · 🎯 ${Math.round(flow.focus)}`
    : pulseLoading
      ? t('reading')
      : flowUnavailable
        ? t('unavailable')
        : undefined

  const glowNum = insight?.glowScore ?? pulse?.glowScore
  const glowMain = glowLoading && !insight ? t('ellipsis') : typeof glowNum === 'number' ? String(glowNum) : t('dash')
  const glowSub = insight
    ? `${insight.nextGoldenHour.start}–${insight.nextGoldenHour.end} · ${insight.nextGoldenHour.minutesUntil}m`
    : glowLoading
      ? t('reading')
      : typeof glowNum === 'number'
        ? t('ambient')
        : t('incomplete')

  const flowHelpDescription = (
    <div className="space-y-2.5">
      <p>{t('flowHelpP1')}</p>
      <ul className="grid gap-1 border-t border-border/30 pt-2.5">
        {(
          [
            [t('flowListEnergy'), t('flowListEnergyGloss')],
            [t('flowListStress'), t('flowListStressGloss')],
            [t('flowListFocus'), t('flowListFocusGloss')],
          ] as const
        ).map(([label, gloss]) => (
          <li key={label} className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 font-medium text-foreground/88">{label}</span>
            <span className="min-w-0 text-right text-[12px] text-muted-foreground">{gloss}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-normal text-muted-foreground/75">{t('flowFootnote')}</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label={t('groupAria')}>
      <PulseStripCell
        pulse={pulse}
        pulseLoading={pulseLoading}
        empty={!pulse && !pulseLoading}
        delay={0}
        main={pulseMain}
        sub={pulseSub}
      />
      <Cell
        kicker={t('flow')}
        title={flow ? t('flowTitleHint') : undefined}
        help={{
          ariaLabel: t('flowHelpAria'),
          title: t('flowHelpTitle'),
          description: flowHelpDescription,
        }}
        main={flowMain}
        sub={flowSub}
        heroSub={!!flow}
        empty={!flow && flowUnavailable}
        delay={reduce ? 0 : 0.04}
      />
      <Cell
        kicker={t('sunGlow')}
        kickerNormalCase
        main={glowMain}
        sub={glowSub}
        empty={!insight && !glowLoading && typeof glowNum !== 'number'}
        delay={reduce ? 0 : 0.08}
      />
    </div>
  )
}
