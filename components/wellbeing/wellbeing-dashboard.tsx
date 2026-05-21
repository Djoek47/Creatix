'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, ExternalLink, Gift, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { AmbientLayer } from '@/components/wellbeing/ambient-layer'
import { MoodConstellation } from '@/components/wellbeing/mood-constellation'
import { GlowCorePanel } from '@/components/wellbeing/glow-core-panel'
import { GoldenHourTimeline } from '@/components/wellbeing/golden-hour-timeline'
import { PositioningAwarenessPanel } from '@/components/wellbeing/positioning-awareness-panel'
import { PerfectShotCarousel } from '@/components/wellbeing/perfect-shot-carousel'
import { FloatingActionCapsules } from '@/components/wellbeing/floating-action-capsules'
import { WellbeingStateStrip } from '@/components/wellbeing/wellbeing-state-strip'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import { fadeInUp } from '@/lib/wellbeing/motion'
import { useDashboardPulse } from '@/components/dashboard/dashboard-pulse-provider'
import { cn } from '@/lib/utils'
import type { PulseSeverity } from '@/lib/wellbeing/pulse-engine'
import { WellbeingLunarCalendar } from '@/components/wellbeing/wellbeing-lunar-calendar'
import { useFlowEnergyAwayRecovery } from '@/hooks/use-flow-energy-away-recovery'

function severityLabel(s: PulseSeverity, t: (key: string) => string): string {
  if (s === 'steady') return t('severitySteady')
  if (s === 'attend') return t('severityAttend')
  return t('severityIntervene')
}

function severityBadgeClass(s: PulseSeverity): string {
  if (s === 'steady') {
    return 'border-emerald-500/30 bg-emerald-500/[0.1] text-emerald-950 dark:text-emerald-100'
  }
  if (s === 'attend') {
    return 'border-amber-500/35 bg-amber-500/[0.12] text-amber-950 dark:text-amber-50'
  }
  return 'border-rose-500/35 bg-rose-500/[0.12] text-rose-950 dark:text-rose-50'
}

function QuietBanner({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm leading-relaxed',
        tone === 'warn'
          ? 'border-amber-500/20 bg-amber-500/[0.04] text-foreground'
          : 'border-border/40 bg-background/50 text-muted-foreground',
      )}
    >
      {children}
    </div>
  )
}

export function WellbeingDashboard() {
  const tStrip = useTranslations('wellbeing.stateStrip')
  const tDash = useTranslations('wellbeing.dashboard')
  const { pulse, loading: pulseLoading, refresh } = useDashboardPulse()
  const [insight, setInsight] = useState<GlowInsightsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [glowLoading, setGlowLoading] = useState(true)

  useEffect(() => {
    void refresh(false)
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setGlowLoading(true)
      setError(null)
      try {
        const insightRes = await fetch('/api/wellbeing/glow-insights', { credentials: 'include' })
        const insightJson = (await insightRes.json().catch(() => ({}))) as Record<string, unknown>
        if (!cancelled) {
          if (!insightRes.ok) {
            setError(typeof insightJson?.error === 'string' ? insightJson.error : tDash('glowInsightsError'))
            setInsight(null)
          } else {
            setInsight(insightJson as GlowInsightsPayload)
          }
        }
      } finally {
        if (!cancelled) setGlowLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tDash])

  const pageLoading = pulseLoading && !pulse

  const pulseFlow = pulse?.flow ?? null
  const flowState = useFlowEnergyAwayRecovery(pulseFlow) ?? pulseFlow

  const baselineNote = useMemo(() => {
    if (!insight?.insightSource || insight.insightSource === 'location') return null
    if (insight.insightSource === 'birthday') {
      return tDash('baselineBirthday')
    }
    return tDash('baselineRough')
  }, [insight, tDash])

  const flowUnavailable = !pulseLoading && !pulseFlow

  if (pageLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-6">
        <div
          className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground/30 motion-safe:animate-spin"
          style={{ animationDuration: '0.85s' }}
          role="status"
          aria-label={tDash('loadingAria')}
        />
        <p className="text-sm text-muted-foreground">{tDash('loading')}</p>
      </div>
    )
  }

  const glowScoreForAmbient = pulse?.glowScore ?? insight?.glowScore ?? 40

  return (
    <div id="wellbeing-overview" className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-border/15 bg-card/[0.15] p-5 sm:p-7 md:p-8">
      <AmbientLayer glowScore={glowScoreForAmbient} />
      <div className="relative z-10 space-y-7 sm:space-y-8">
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.125rem]">{tDash('title')}</h1>
        </header>

        <div id="wellbeing-state-strip" data-divine-control="wellbeing-state-strip" className="scroll-mt-28">
          <WellbeingStateStrip
            pulse={pulse}
            pulseLoading={pulseLoading}
            insight={insight}
            flow={flowState}
            flowUnavailable={flowUnavailable}
            glowLoading={glowLoading}
          />
        </div>

        <motion.section id="wellbeing-lunar-calendar" data-divine-control="wellbeing-lunar-calendar" {...fadeInUp} className="scroll-mt-28">
          <WellbeingLunarCalendar />
        </motion.section>

        {pulse ? (
          <motion.section {...fadeInUp} className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <Badge
                variant="outline"
                className={cn('rounded-full text-[10px] font-semibold uppercase tracking-wide', severityBadgeClass(pulse.severity))}
              >
                {severityLabel(pulse.severity, tStrip)}
              </Badge>
              {pulse.narrativeSource === 'ai' ? (
                <span className="text-[10px] text-muted-foreground/75">{tDash('aiRefined')}</span>
              ) : null}
            </div>
            <h2 className="text-balance text-2xl font-semibold leading-[1.2] tracking-tight text-foreground sm:text-[1.625rem]">
              {pulse.headline}
            </h2>
            <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">{pulse.narrative}</p>
            {pulse.whyBullets.length > 0 ? (
              <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90">
                {pulse.whyBullets.map((b, i) => (
                  <li key={`${i}-${b.slice(0, 24)}`}>{b}</li>
                ))}
              </ul>
            ) : null}
            <Button
              asChild
              className="h-10 rounded-full bg-foreground px-5 text-background hover:bg-foreground/90 dark:bg-amber-100/95 dark:text-amber-950 dark:hover:bg-amber-100/85"
            >
              <Link href={pulse.nextAction.href}>
                {pulse.nextAction.label}
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>

            <Collapsible className="rounded-2xl border border-border/30 bg-background/35">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/10 data-[state=open]:[&_svg]:rotate-180">
                <span>{tDash('signals')}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/20 px-4 pb-4 pt-2">
                <ul className="space-y-3">
                  {pulse.sources.map((s) => (
                    <li key={s.id} className="text-sm">
                      <p className="font-medium text-foreground">{s.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </motion.section>
        ) : (
          <motion.section {...fadeInUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-snug text-muted-foreground">{tDash('pulseLoadError')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 self-start rounded-full sm:self-auto"
              onClick={() => void refresh(true)}
            >
              {tDash('retry')}
            </Button>
          </motion.section>
        )}

        {(baselineNote || insight?.setupHint) && (
          <motion.section {...fadeInUp}>
            <QuietBanner>
              <div className="space-y-1.5 text-xs leading-snug">
                {baselineNote ? <p>{baselineNote}</p> : null}
                {insight?.setupHint ? <p className="text-muted-foreground">{insight.setupHint}</p> : null}
              </div>
            </QuietBanner>
          </motion.section>
        )}

        <motion.section {...fadeInUp} className="group">
          <div className="flex items-stretch justify-between gap-3 rounded-2xl border border-border/25 bg-background/40 px-4 py-3.5 sm:px-5">
            <Link
              href="/dashboard/ai-studio/gifts"
              className="flex min-w-0 flex-1 items-center gap-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              data-tour="well-being-gift-wishlist"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/30 bg-background/50">
                <Gift className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
              <span className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">{tDash('giftWishlist')}</span>
            </Link>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
                  aria-label={tDash('aboutGiftWishlistAria')}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] text-sm leading-relaxed" align="end" sideOffset={6}>
                <p className="font-medium text-foreground">{tDash('wishlist')}</p>
                <p className="mt-2 text-muted-foreground">{tDash('wishlistPopoverBody')}</p>
              </PopoverContent>
            </Popover>
          </div>
        </motion.section>

        <motion.section id="wellbeing-flow-state" data-divine-control="wellbeing-flow-state" {...fadeInUp} className="scroll-mt-28">
          <Collapsible defaultOpen className="overflow-hidden rounded-2xl border border-border/30 bg-card/[0.2]">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/10 data-[state=open]:[&_svg]:rotate-180">
              <span>{tDash('flow')}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-border/20 p-3 sm:p-4">
                <MoodConstellation
                  embedded
                  flowState={flowState}
                  flowUnavailable={flowUnavailable}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.section>

        {!insight && !glowLoading ? (
          <motion.div {...fadeInUp}>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-background/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-snug text-muted-foreground">
                {error || tDash('envMissing')}
              </p>
              <Button asChild variant="secondary" className="h-9 shrink-0 rounded-full self-start sm:self-auto">
                <Link href="/dashboard/settings?tab=profile">
                  {tDash('openSettings')}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : null}

        {insight ? (
          <motion.section id="wellbeing-light-place" data-divine-control="wellbeing-light-place" {...fadeInUp} className="scroll-mt-28 space-y-4">
            <Collapsible
              defaultOpen
              className="overflow-hidden rounded-2xl border border-border/30 bg-card/[0.2]"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/10 data-[state=open]:[&_svg]:rotate-180">
                <span>{tDash('light')}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 border-t border-border/20 p-4 sm:p-5 sm:space-y-7">
                <GlowCorePanel insight={insight} embedded />
                <div id="wellbeing-positioning-awareness" data-divine-control="wellbeing-positioning-awareness" className="scroll-mt-28">
                  <PositioningAwarenessPanel insight={insight} />
                </div>
                <div id="wellbeing-golden-hour" data-divine-control="wellbeing-golden-hour" className="scroll-mt-28">
                  <GoldenHourTimeline timeline={insight.timeline} />
                </div>
                <PerfectShotCarousel days={insight.perfectShotDays} />
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tDash('suggestions')}</h3>
                  <FloatingActionCapsules actions={insight.actionCapsules} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.section>
        ) : null}
      </div>
    </div>
  )
}
