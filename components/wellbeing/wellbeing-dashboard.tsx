'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  HeartPulse,
  MoonStar,
  ShieldCheck,
  MessageSquareHeart,
  Sparkles,
  Loader2,
  ArrowUpRight,
} from 'lucide-react'
import { CreatorMoodPulse } from '@/components/wellbeing/creator-mood-pulse'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const CosmicCalendar = dynamic(
  () => import('@/components/content/cosmic-calendar').then((m) => m.CosmicCalendar),
  { ssr: false },
)

type Conv = {
  user?: { name?: string; username?: string }
  lastMessage?: { text?: string }
  unreadCount?: number
}

type MimicProfile = {
  tabooTopics?: string[]
  bannedPhrases?: string[]
  escalateOnKeywords?: string[]
  toneWarmth?: number
  humorLevel?: number
  flirtCeiling?: number
}

function scoreMessagePressure(conversations: Conv[], mimic: MimicProfile | null) {
  const unread = conversations.reduce((s, c) => s + Number(c.unreadCount || 0), 0)
  const texts = conversations
    .map((c) => String(c.lastMessage?.text || '').toLowerCase())
    .filter(Boolean)

  const stressWords = ['urgent', 'now', 'angry', 'hate', 'refund', 'scam', 'wtf', 'mad', 'why no reply']
  const stressHits = texts.reduce((s, t) => s + (stressWords.some((w) => t.includes(w)) ? 1 : 0), 0)

  const boundaryWords = [
    ...(mimic?.tabooTopics ?? []),
    ...(mimic?.bannedPhrases ?? []),
    ...(mimic?.escalateOnKeywords ?? []),
  ]
    .map((s) => String(s || '').toLowerCase().trim())
    .filter(Boolean)
    .slice(0, 80)

  const boundaryHits = texts.reduce(
    (s, t) => s + (boundaryWords.some((w) => w.length > 2 && t.includes(w)) ? 1 : 0),
    0,
  )

  const pressure = Math.min(100, unread * 4 + stressHits * 10 + boundaryHits * 12)
  return { unread, stressHits, boundaryHits, pressure }
}

export function WellbeingDashboard() {
  const [loading, setLoading] = useState(true)
  const [mimicProfile, setMimicProfile] = useState<MimicProfile | null>(null)
  const [conversations, setConversations] = useState<Conv[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [mimicRes, ofRes, fsRes] = await Promise.all([
          fetch('/api/divine/mimic-profile').catch(() => null),
          fetch('/api/onlyfans/conversations').catch(() => null),
          fetch('/api/fansly/conversations').catch(() => null),
        ])

        const [mimicJson, ofJson, fsJson] = await Promise.all([
          mimicRes?.ok ? mimicRes.json() : Promise.resolve({}),
          ofRes?.ok ? ofRes.json() : Promise.resolve({ conversations: [] }),
          fsRes?.ok ? fsRes.json() : Promise.resolve({ conversations: [] }),
        ])

        if (cancelled) return
        setMimicProfile((mimicJson?.mimic_profile as MimicProfile) ?? null)
        setConversations([
          ...((ofJson?.conversations as Conv[]) ?? []),
          ...((fsJson?.conversations as Conv[]) ?? []),
        ])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const pulse = useMemo(
    () => scoreMessagePressure(conversations, mimicProfile),
    [conversations, mimicProfile],
  )

  const wellbeingBand =
    pulse.pressure < 25 ? 'grounded' : pulse.pressure < 55 ? 'active' : pulse.pressure < 80 ? 'loaded' : 'overloaded'

  const ritual = useMemo(() => {
    if (wellbeingBand === 'grounded')
      return 'You are in a stable zone. Run one high-value conversation and schedule one soft recovery break.'
    if (wellbeingBand === 'active')
      return 'You are in productive flow. Clear unread from top spenders first, then take a 5-minute screen reset.'
    if (wellbeingBand === 'loaded')
      return 'Cognitive load is rising. Pause non-urgent replies, run Divine suggestions only for priority fans, and hydrate.'
    return 'High load detected. Do not mass-reply manually right now. Focus on 3 critical threads, then take a full 10-minute reset.'
  }, [wellbeingBand])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Badge variant="outline" className="capitalize gap-1.5">
          <HeartPulse className="h-3.5 w-3.5" aria-hidden />
          State: {wellbeingBand}
        </Badge>
      </div>

      <CreatorMoodPulse />

      {loading ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareHeart className="h-4 w-4 text-primary" />
                Message Pressure Index
              </CardTitle>
              <CardDescription>Unread + intensity + boundary collision signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-bold">{pulse.pressure}/100</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Unread conversations impact: {pulse.unread}</p>
                <p>Stress-word hits: {pulse.stressHits}</p>
                <p>Boundary-trigger hits: {pulse.boundaryHits}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-circe/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-circe-light" />
                Nervous System Ritual (AI-guided)
              </CardTitle>
              <CardDescription>
                Creative recovery protocol generated from your live messaging load.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{ritual}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/messages">
                    Prioritize messages
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/divine-manager?section=mimic">
                    Tune boundaries
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/community/circe-daily">
                    Daily Circe tip
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-venus/30 bg-gradient-to-br from-venus/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-venus" />
            Profile-Calibrated Wellness
          </CardTitle>
          <CardDescription>
            Drawn from your Mimic profile scanning signals so the recommendations match your voice + limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Tone Warmth</p>
            <p className="text-lg font-semibold">{mimicProfile?.toneWarmth ?? 3}/5</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Humor Level</p>
            <p className="text-lg font-semibold">{mimicProfile?.humorLevel ?? 2}/5</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Flirt Ceiling</p>
            <p className="text-lg font-semibold">{mimicProfile?.flirtCeiling ?? 2}/5</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MoonStar className="h-4 w-4 text-primary" />
            Cosmic Well-being Lab
          </CardTitle>
          <CardDescription>
            Use the cosmic calendar and location-aware tools to plan low-stress, high-energy creation windows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CosmicCalendar />
        </CardContent>
      </Card>
    </div>
  )
}

