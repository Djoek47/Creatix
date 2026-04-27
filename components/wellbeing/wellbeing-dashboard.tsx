'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowUpRight, Gift, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { AmbientLayer } from '@/components/wellbeing/ambient-layer'
import { MoodConstellation } from '@/components/wellbeing/mood-constellation'
import { GlowCorePanel } from '@/components/wellbeing/glow-core-panel'
import { GoldenHourTimeline } from '@/components/wellbeing/golden-hour-timeline'
import { PerfectShotCarousel } from '@/components/wellbeing/perfect-shot-carousel'
import { PositionCompass } from '@/components/wellbeing/position-compass'
import { FloatingActionCapsules } from '@/components/wellbeing/floating-action-capsules'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import { fadeInUp } from '@/lib/wellbeing/motion'

const CosmicCalendar = dynamic(
  () => import('@/components/content/cosmic-calendar').then((mod) => mod.CosmicCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border/60 bg-muted/10 px-5 py-8 text-sm text-muted-foreground">
        Loading calendar…
      </div>
    ),
  },
)

type Conv = {
  lastMessage?: { text?: string }
  unreadCount?: number
}

type MimicProfile = {
  tabooTopics?: string[]
  bannedPhrases?: string[]
  escalateOnKeywords?: string[]
}

function scoreMessagePressure(conversations: Conv[], mimic: MimicProfile | null) {
  const unread = conversations.reduce((s, c) => s + Number(c.unreadCount || 0), 0)
  const texts = conversations.map((c) => String(c.lastMessage?.text || '').toLowerCase()).filter(Boolean)
  const stressWords = ['urgent', 'now', 'angry', 'refund', 'scam', 'wtf']
  const stressHits = texts.reduce((s, t) => s + (stressWords.some((w) => t.includes(w)) ? 1 : 0), 0)
  const boundaryWords = [
    ...(mimic?.tabooTopics ?? []),
    ...(mimic?.bannedPhrases ?? []),
    ...(mimic?.escalateOnKeywords ?? []),
  ]
    .map((s) => String(s || '').toLowerCase().trim())
    .filter(Boolean)
  const boundaryHits = texts.reduce(
    (s, t) => s + (boundaryWords.some((w) => w.length > 2 && t.includes(w)) ? 1 : 0),
    0,
  )
  return Math.min(100, unread * 4 + stressHits * 10 + boundaryHits * 12)
}

export function WellbeingDashboard() {
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<GlowInsightsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messagePressure, setMessagePressure] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [insightRes, mimicRes, ofRes, fsRes] = await Promise.all([
          fetch('/api/wellbeing/glow-insights', { credentials: 'include' }),
          fetch('/api/divine/mimic-profile').catch(() => null),
          fetch('/api/onlyfans/conversations').catch(() => null),
          fetch('/api/fansly/conversations').catch(() => null),
        ])
        const [insightJson, mimicJson, ofJson, fsJson] = await Promise.all([
          insightRes.json().catch(() => ({})),
          mimicRes?.ok ? mimicRes.json() : Promise.resolve({}),
          ofRes?.ok ? ofRes.json() : Promise.resolve({ conversations: [] }),
          fsRes?.ok ? fsRes.json() : Promise.resolve({ conversations: [] }),
        ])
        if (!cancelled) {
          if (!insightRes.ok) {
            setError(typeof insightJson?.error === 'string' ? insightJson.error : 'Glow insights unavailable.')
          } else {
            setInsight(insightJson as GlowInsightsPayload)
          }
          const conversations = [
            ...(((ofJson as { conversations?: Conv[] }).conversations ?? []) as Conv[]),
            ...(((fsJson as { conversations?: Conv[] }).conversations ?? []) as Conv[]),
          ]
          const mimic = ((mimicJson as { mimic_profile?: MimicProfile }).mimic_profile ?? null) as
            | MimicProfile
            | null
          setMessagePressure(scoreMessagePressure(conversations, mimic))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const unifiedSentence = useMemo(() => {
    if (!insight) return null
    return `Message pressure ${messagePressure}/100. ${insight.insightSentence}`
  }, [insight, messagePressure])

  const baselineNote = useMemo(() => {
    if (!insight?.insightSource || insight.insightSource === 'location') return null
    if (insight.insightSource === 'birthday') {
      return 'Birthday-calibrated. Add location in Settings for weather-aware detail.'
    }
    return 'Baseline mode without location. Add birthday or location in Settings to personalize.'
  }, [insight])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-6">
        <div
          className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground/30 motion-safe:animate-spin"
          style={{ animationDuration: '0.85s' }}
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-muted-foreground">Preparing your readout…</p>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/50 bg-card/25 p-6 sm:p-8">
      <AmbientLayer glowScore={insight?.glowScore ?? 40} />
      <div className="relative z-10 space-y-10 sm:space-y-12">
        <motion.section {...fadeInUp} className="space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Flow state</p>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Inbox load, light windows, and positioning—updated when you open this page.
            </p>
          </div>

          {(unifiedSentence || baselineNote || insight?.setupHint) && (
            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-4 backdrop-blur-sm">
              {unifiedSentence ? <p className="text-sm leading-relaxed text-foreground">{unifiedSentence}</p> : null}
              {baselineNote ? <p className="text-xs leading-relaxed text-muted-foreground">{baselineNote}</p> : null}
              {insight?.setupHint ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{insight.setupHint}</p>
              ) : null}
            </div>
          )}
        </motion.section>

        <motion.section {...fadeInUp}>
          <Card className="rounded-2xl border-border/70 shadow-none transition-colors hover:bg-muted/[0.04]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Link
                  href="/dashboard/ai-studio/gifts"
                  className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  data-tour="well-being-gift-wishlist"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/20">
                    <Gift className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">
                      Gift wishlist
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Saved links fans and AI can reference when gifting comes up.
                    </p>
                  </div>
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
                      aria-label="How Gift wishlist works"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] text-sm" align="end" sideOffset={6}>
                    <p className="font-medium text-foreground">How it works</p>
                    <p className="mt-2 text-muted-foreground">
                      Add product links you like. We load title and price when the store allows—you can edit anytime.
                      Chatter, Divine Manager, and Gift Suggester can use this context. Managing the list is free; Gift
                      Suggester uses credits when you run it.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section {...fadeInUp}>
          <MoodConstellation />
        </motion.section>

        {!insight ? (
          <Card className="rounded-2xl border-destructive/25 bg-destructive/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold tracking-tight">Insights unavailable</CardTitle>
              <CardDescription>{error || 'Please try again in a moment.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/dashboard/settings?tab=profile">
                  Open Settings
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.section {...fadeInUp} className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <GlowCorePanel insight={insight} />
              </div>
              <PositionCompass positioning={insight.positioning} />
            </motion.section>

            <motion.section {...fadeInUp}>
              <GoldenHourTimeline timeline={insight.timeline} />
            </motion.section>

            <motion.section {...fadeInUp}>
              <PerfectShotCarousel days={insight.perfectShotDays} />
            </motion.section>

            <motion.section {...fadeInUp} className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Suggestions</h3>
              <FloatingActionCapsules actions={insight.actionCapsules} />
            </motion.section>
          </>
        )}

        <motion.section {...fadeInUp} className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Calendar &amp; moon</h3>
          <CosmicCalendar />
        </motion.section>
      </div>
    </div>
  )
}
