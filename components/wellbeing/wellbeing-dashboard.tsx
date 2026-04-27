'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Loader2, ArrowUpRight, Sparkles, AlertCircle, Gift, Info } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import { fadeInUp } from '@/lib/wellbeing/motion'

const CosmicCalendar = dynamic(
  () => import('@/components/content/cosmic-calendar').then((mod) => mod.CosmicCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
        Loading cosmic calendar...
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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/50 p-5 md:p-7">
      <AmbientLayer glowScore={insight?.glowScore ?? 40} />
      <div className="relative z-10 space-y-6">
        <motion.section {...fadeInUp} className="space-y-3">
          <Badge variant="outline" className="border-amber-400/40 bg-amber-300/10 text-amber-700 dark:text-amber-300">
            Flow State System
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Well-being, tuned to light and rhythm.</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A calm intelligence layer for your body state, message load, and atmospheric glow windows.
          </p>
          {unifiedSentence ? (
            <p className="max-w-3xl rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm">
              {unifiedSentence}
            </p>
          ) : null}
          {insight?.insightSource && insight.insightSource !== 'location' ? (
            <p className="max-w-3xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
              {insight.insightSource === 'birthday'
                ? 'Running in birthday-calibrated mode. Weather precision unlocks once location is added.'
                : 'Running in baseline mode without location. Add birthday or location to personalize further.'}
            </p>
          ) : null}
          {insight?.setupHint ? (
            <p className="max-w-3xl text-xs text-muted-foreground">{insight.setupHint}</p>
          ) : null}
        </motion.section>

        <motion.section {...fadeInUp}>
          <Card className="relative h-full overflow-hidden border border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/35 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_28px_-8px_rgba(168,85,247,0.35),0_12px_40px_-16px_rgba(0,0,0,0.2)]">
            <CardContent className="p-4 pt-5">
              <div className="flex items-start gap-1 sm:gap-2">
                <Link
                  href="/dashboard/ai-studio/gifts"
                  className="group flex min-w-0 flex-1 items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                  data-tour="well-being-gift-wishlist"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-purple-600/15 ring-1 ring-amber-500/10 transition-all duration-300 group-hover:from-pink-500/20 group-hover:via-amber-400/15 group-hover:to-cyan-500/15 group-hover:ring-purple-400/25">
                    <Gift className="ai-tools-lib-icon h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <h2 className="ai-tools-lib-title text-[15px] font-semibold leading-tight">Gift wishlist</h2>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      Your saved gift links—so fans and AI have real products to talk about.
                    </p>
                  </div>
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="How Gift wishlist works"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] text-sm" align="end" sideOffset={6}>
                    <p className="font-medium text-foreground">How it works</p>
                    <p className="mt-2 text-muted-foreground">
                      Add any product links you like. We try to load title, price, and details when a store allows
                      it—you can always edit. Chatter, Divine Manager, and Gift Suggester can use that context when
                      a fan wants to send a gift. Managing the list is free; use Gift Suggester from Divine Manager
                      (1 credit) when you want AI-ranked picks.
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
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4" />
                Insight feed temporarily unavailable
              </CardTitle>
              <CardDescription>
                {error || 'Please refresh in a moment.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/dashboard/settings?tab=profile">
                  Open Settings
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.section {...fadeInUp} className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
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
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Contextual action capsules
              </div>
              <FloatingActionCapsules actions={insight.actionCapsules} />
            </motion.section>
          </>
        )}

        <motion.section {...fadeInUp} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Cosmic calendar + moon rhythm
          </div>
          <CosmicCalendar />
        </motion.section>
      </div>
    </div>
  )
}

