'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalyticsSnapshot, Content } from '@/lib/types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AnalyticsCharts } from '@/components/analytics/analytics-charts'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { TopContent } from '@/components/analytics/top-content'
import { OnlyFansApiAnalytics } from '@/components/analytics/onlyfans-api-analytics'
import Link from 'next/link'
import { Activity, Link2, MessageCircle, Sparkles, TrendingUp } from 'lucide-react'

type Connection = {
  platform: string
  last_sync_at?: string | null
}

const PLATFORM_META: Record<
  string,
  { label: string; logoSrc: string; ring: string; bg: string }
> = {
  onlyfans: { label: 'OnlyFans', logoSrc: '/onlyfans-logo.png', ring: 'ring-sky-500/40', bg: 'bg-sky-500/10' },
  fansly: { label: 'Fansly', logoSrc: '/fansly-logo.png', ring: 'ring-blue-500/40', bg: 'bg-blue-500/10' },
  mym: { label: 'MYM', logoSrc: '', ring: 'ring-rose-500/40', bg: 'bg-rose-500/10' },
}

function formatNumber(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) parts.unshift(str.slice(Math.max(0, i - 3), i))
  return parts.join(',')
}

function formatLastSync(dateStr?: string | null) {
  if (!dateStr) return 'Never'
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const h = Math.floor(diffMins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function AnalyticsDashboard({
  analytics,
  connections,
  content,
  hasOnlyFansConnected,
}: {
  analytics: AnalyticsSnapshot[]
  connections: Connection[]
  content: Content[]
  /** True when OnlyFans is connected with a valid session (matches server / API gate). */
  hasOnlyFansConnected: boolean
}) {
  const connectedPlatforms = useMemo(
    () => Array.from(new Set((connections || []).map((c) => c.platform))).sort(),
    [connections],
  )

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    connectedPlatforms.length > 0 ? connectedPlatforms : [],
  )

  useEffect(() => {
    setSelectedPlatforms((prev) => {
      const extra = connectedPlatforms.filter((p) => !prev.includes(p))
      if (extra.length === 0) return prev
      return [...prev, ...extra]
    })
  }, [connectedPlatforms])

  const filtered = useMemo(() => {
    if (selectedPlatforms.length === 0) return analytics
    return analytics.filter((a) => selectedPlatforms.includes(a.platform))
  }, [analytics, selectedPlatforms])

  const hasConnections = connectedPlatforms.length > 0

  const latestByPlatform = useMemo(() => {
    const m = new Map<string, AnalyticsSnapshot>()
    filtered.forEach((a) => {
      const prev = m.get(a.platform)
      if (!prev || new Date(a.date) > new Date(prev.date)) m.set(a.platform, a)
    })
    return m
  }, [filtered])

  const totals = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, a) => sum + (a.revenue || 0), 0)
    const messagesReceived = filtered.reduce((sum, a) => sum + (a.messages_received || 0), 0)
    const messagesSent = filtered.reduce((sum, a) => sum + (a.messages_sent || 0), 0)
    const newFans = filtered.reduce((sum, a) => sum + (a.new_fans || 0), 0)
    const churned = filtered.reduce((sum, a) => sum + (a.churned_fans || 0), 0)
    const totalFans = Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0)

    const responseSamples = Array.from(latestByPlatform.values())
      .map((a) => a.avg_response_time_minutes)
      .filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
    const avgResponse =
      responseSamples.length > 0
        ? responseSamples.reduce((s, n) => s + n, 0) / responseSamples.length
        : 0

    return { totalRevenue, messagesReceived, messagesSent, newFans, churned, totalFans, avgResponse }
  }, [filtered, latestByPlatform])

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )
  }

  const showAll = () => setSelectedPlatforms(connectedPlatforms)
  const showNone = () => setSelectedPlatforms([])

  return (
    <div className="space-y-8 min-w-0">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-background to-circe/[0.03] p-5 sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-circe/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-circe">
              <Activity className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Circe snapshot</span>
            </div>
            <h2 className="text-lg font-semibold sm:text-xl">What your synced numbers already tell us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These totals come from snapshots we save when you sync and when activity arrives from your connected
              platforms. They anchor your dashboard charts — even when live numbers are still catching up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link href="/dashboard/settings?tab=integrations">
                <Link2 className="h-4 w-4" />
                Integrations
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link href="/dashboard/messages">
                <MessageCircle className="h-4 w-4" />
                Messages
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2 border-circe/40">
              <Link href="/dashboard/analytics/income-predictor">
                <TrendingUp className="h-4 w-4" />
                Income Predictor
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-2 bg-circe text-circe-foreground hover:bg-circe/90">
              <Link href="/dashboard/retention/churn">
                <Sparkles className="h-4 w-4" />
                Churn predictor
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-end gap-4">
        <div className="flex flex-col sm:items-end gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={showAll} disabled={!hasConnections}>
              All
            </Button>
            <Button size="sm" variant="ghost" onClick={showNone} disabled={!hasConnections}>
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {connectedPlatforms.map((platform) => {
              const meta = PLATFORM_META[platform] || {
                label: platform,
                logoSrc: '',
                ring: 'ring-border',
                bg: 'bg-muted',
              }
              const selected = selectedPlatforms.includes(platform)
              const lastSync = connections.find((c) => c.platform === platform)?.last_sync_at
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-2 text-sm transition',
                    'border border-border hover:bg-muted/50',
                    selected && 'ring-2 ring-offset-2 ring-offset-background',
                    selected && meta.ring,
                    selected && meta.bg,
                  )}
                  aria-pressed={selected}
                  title={`${meta.label} • Last synced: ${formatLastSync(lastSync)}`}
                >
                  {meta.logoSrc ? (
                    <img src={meta.logoSrc} alt={meta.label} className="h-4 w-4 rounded-sm" />
                  ) : null}
                  <span className="hidden sm:inline">{meta.label}</span>
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {formatLastSync(lastSync)}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border/80 bg-card/90 lg:col-span-2 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Total revenue (30d window)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {hasConnections ? `$${formatNumber(totals.totalRevenue)}` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription>Subscribers (latest)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {hasConnections ? formatNumber(totals.totalFans) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription>Messages in (30d)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {hasConnections ? formatNumber(totals.messagesReceived) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription>Messages out (30d)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {hasConnections ? formatNumber(totals.messagesSent) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <CardDescription>Net new fans (30d)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {hasConnections ? formatNumber(totals.newFans - totals.churned) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 bg-card/90 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Avg response time</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {hasConnections ? `${Math.round(totals.avgResponse)}m` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {hasOnlyFansConnected ? (
        <OnlyFansApiAnalytics />
      ) : (
        <Card className="border-dashed border-border/80 bg-muted/20">
          <CardHeader className="py-8 sm:py-10">
            <CardTitle className="text-base font-medium">OnlyFans partner analytics</CardTitle>
            <CardDescription className="text-sm leading-relaxed max-w-prose">
              Connect OnlyFans under{' '}
              <Link href="/dashboard/settings?tab=integrations" className="text-circe underline-offset-4 hover:underline">
                Settings → Integrations
              </Link>{' '}
              to unlock live earnings, forecasts, and transaction intelligence from the partner API. Until then, this
              section stays hidden so you are not prompted with empty endpoints.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <AnalyticsCharts analytics={filtered} hasConnections={hasConnections} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformBreakdown analytics={filtered} />
        <TopContent content={content || []} />
      </div>
    </div>
  )
}
