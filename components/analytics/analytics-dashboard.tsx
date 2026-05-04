'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AnalyticsSnapshot, Content } from '@/lib/types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AnalyticsCharts } from '@/components/analytics/analytics-charts'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { TopContent } from '@/components/analytics/top-content'
import { OnlyFansApiAnalytics } from '@/components/analytics/onlyfans-api-analytics'
import { FanslyGrowthAnalytics } from '@/components/analytics/fansly-growth-analytics'
import Link from 'next/link'
import { Link2, MessageCircle, TrendingUp } from 'lucide-react'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC, MANYVIDS_LOGO_SRC } from '@/lib/platform-logos'

type Connection = {
  platform: string
  last_sync_at?: string | null
}

const PLATFORM_META: Record<string, { label: string; logoSrc: string }> = {
  onlyfans: { label: 'OnlyFans', logoSrc: ONLYFANS_LOGO_SRC },
  fansly: { label: 'Fansly', logoSrc: FANSLY_LOGO_SRC },
  manyvids: { label: 'ManyVids', logoSrc: MANYVIDS_LOGO_SRC },
  mym: { label: 'MYM', logoSrc: '/mym-logo.png' },
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
  hasFanslyConnected,
}: {
  analytics: AnalyticsSnapshot[]
  connections: Connection[]
  content: Content[]
  /** True when OnlyFans is connected with a valid session (matches server / API gate). */
  hasOnlyFansConnected: boolean
  /** True when Fansly is connected (account id on `platform_connections`). */
  hasFanslyConnected: boolean
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
    <div className="min-w-0 space-y-8">
      <section className="rounded-2xl border border-border/60 bg-card/25 px-5 py-5 sm:px-6 sm:py-6">
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Figures below come from saved sync snapshots and activity from connected platforms. Use the filters to scope
          charts; live OnlyFans partner analytics appear when OnlyFans is connected, and Fansly growth blocks when Fansly
          is connected.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-full border-border/70 shadow-none"
          >
            <Link href="/dashboard/settings?tab=integrations">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Integrations
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-full border-border/70 shadow-none"
          >
            <Link href="/dashboard/messages">
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Messages
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-full border-border/70 shadow-none"
          >
            <Link href="/dashboard/analytics/income-predictor">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Income predictor
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-full border-border/70 shadow-none"
          >
            <Link href="/dashboard/retention/churn">Churn predictor</Link>
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full border-border/70 px-3 text-xs shadow-none"
            onClick={showAll}
            disabled={!hasConnections}
          >
            All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-3 text-xs text-muted-foreground"
            onClick={showNone}
            disabled={!hasConnections}
          >
            Clear
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connectedPlatforms.map((platform) => {
            const meta = PLATFORM_META[platform] || { label: platform, logoSrc: '' }
            const selected = selectedPlatforms.includes(platform)
            const lastSync = connections.find((c) => c.platform === platform)?.last_sync_at
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selected
                    ? 'border-foreground/20 bg-foreground/[0.06] text-foreground'
                    : 'border-border/70 bg-background/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                )}
                aria-pressed={selected}
                title={`${meta.label} • Last synced: ${formatLastSync(lastSync)}`}
              >
                {meta.logoSrc ? (
                  <img
                    src={meta.logoSrc}
                    alt=""
                    className="h-4 w-auto max-w-[4.25rem] object-contain object-center opacity-90"
                  />
                ) : null}
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="tabular-nums text-[11px] text-muted-foreground sm:ml-0.5">
                  {formatLastSync(lastSync)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="rounded-2xl border-border/60 bg-card/40 shadow-none lg:col-span-2 xl:col-span-2">
          <CardHeader className="pb-3 pt-5">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total revenue (30d)
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem]">
              {hasConnections ? `$${formatNumber(totals.totalRevenue)}` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-card/40 shadow-none">
          <CardHeader className="pb-3 pt-5">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subscribers (latest)
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem]">
              {hasConnections ? formatNumber(totals.totalFans) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-card/40 shadow-none">
          <CardHeader className="pb-3 pt-5">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Messages in (30d)
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem]">
              {hasConnections ? formatNumber(totals.messagesReceived) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-card/40 shadow-none">
          <CardHeader className="pb-3 pt-5">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Messages out (30d)
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem]">
              {hasConnections ? formatNumber(totals.messagesSent) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-card/40 shadow-none">
          <CardHeader className="pb-3 pt-5">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Net new fans (30d)
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem]">
              {hasConnections ? formatNumber(totals.newFans - totals.churned) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-card/40 shadow-none sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <CardHeader className="pb-3 pt-5">
            <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg response time
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem]">
              {hasConnections ? `${Math.round(totals.avgResponse)}m` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {hasOnlyFansConnected ? (
        <OnlyFansApiAnalytics />
      ) : (
        <Card className="rounded-2xl border border-dashed border-border/70 bg-muted/15 shadow-none">
          <CardHeader className="py-8 sm:py-9">
            <CardTitle className="text-base font-semibold tracking-tight">OnlyFans partner analytics</CardTitle>
            <CardDescription className="mt-2 max-w-prose text-[15px] leading-relaxed">
              Connect OnlyFans in{' '}
              <Link
                href="/dashboard/settings?tab=integrations"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Settings → Integrations
              </Link>{' '}
              for live earnings and forecasts. This block stays empty until the partner session is active.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasFanslyConnected ? (
        <FanslyGrowthAnalytics />
      ) : (
        <Card className="rounded-2xl border border-dashed border-border/70 bg-muted/15 shadow-none">
          <CardHeader className="py-8 sm:py-9">
            <CardTitle className="text-base font-semibold tracking-tight">Fansly growth APIs</CardTitle>
            <CardDescription className="mt-2 max-w-prose text-[15px] leading-relaxed">
              Connect Fansly in{' '}
              <Link
                href="/dashboard/settings?tab=integrations"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Settings → Integrations
              </Link>{' '}
              to load transactions, top supporters, and follower discovery from the Fansly partner API.
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
