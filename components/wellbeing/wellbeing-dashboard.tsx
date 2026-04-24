'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Loader2, ArrowUpRight, Sparkles, AlertCircle } from 'lucide-react'
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

