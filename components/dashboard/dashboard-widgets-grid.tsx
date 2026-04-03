'use client'

import { useCallback, useEffect, useState } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import { GripVertical, Heart, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { PlatformIntegrationWidget } from '@/components/dashboard/platform-integration-widget'
import { SocialReputationWidget } from '@/components/dashboard/social-reputation-widget'
import { OnlyFansNotificationsCard } from '@/components/dashboard/onlyfans-notifications-card'
import { MessageActivity } from '@/components/dashboard/message-activity'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const STORAGE_KEY = 'circe-dashboard-layout-v1'

export const DEFAULT_DASHBOARD_LAYOUT: Layout = [
  { i: 'stats', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
  { i: 'standardAttraction', x: 0, y: 4, w: 12, h: 3, minW: 4, minH: 2 },
  { i: 'revenue', x: 0, y: 7, w: 8, h: 8, minW: 4, minH: 5 },
  { i: 'quickColumn', x: 8, y: 7, w: 4, h: 8, minW: 3, minH: 6 },
  { i: 'messageActivity', x: 0, y: 15, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'alertsColumn', x: 4, y: 15, w: 8, h: 6, minW: 4, minH: 4 },
  { i: 'recentFans', x: 0, y: 21, w: 12, h: 6, minW: 6, minH: 4 },
  { i: 'socialRep', x: 0, y: 27, w: 12, h: 5, minW: 6, minH: 3 },
]

function isLayoutValid(layout: unknown): layout is Layout {
  if (!Array.isArray(layout) || layout.length === 0) return false
  return layout.every(
    (it) =>
      it &&
      typeof it === 'object' &&
      typeof (it as { i?: string }).i === 'string' &&
      typeof (it as { x?: number }).x === 'number' &&
      typeof (it as { y?: number }).y === 'number' &&
      typeof (it as { w?: number }).w === 'number' &&
      typeof (it as { h?: number }).h === 'number',
  )
}

const GridWithWidth = WidthProvider(GridLayout)

function DragStrip({ label }: { label: string }) {
  return (
    <div className="dashboard-widget-drag mb-2 flex h-9 shrink-0 cursor-grab items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 text-muted-foreground active:cursor-grabbing">
      <GripVertical className="h-4 w-4 shrink-0" aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
    </div>
  )
}

export type DashboardWidgetsGridProps = {
  userId: string
  stats: React.ComponentProps<typeof StatsCards>['stats']
  analytics: React.ComponentProps<typeof RevenueChart>['analytics']
  hasConnectedPlatforms: boolean
  fans: React.ComponentProps<typeof RecentFans>['fans']
  totalFans: number
  leakAlerts: React.ComponentProps<typeof AlertsWidget>['leakAlerts']
  mentions: React.ComponentProps<typeof AlertsWidget>['mentions']
}

export function DashboardWidgetsGrid({
  userId,
  stats,
  analytics,
  hasConnectedPlatforms,
  fans,
  totalFans,
  leakAlerts,
  mentions,
}: DashboardWidgetsGridProps) {
  const storageKey = `${STORAGE_KEY}:${userId}`
  const [layout, setLayout] = useState<Layout>(DEFAULT_DASHBOARD_LAYOUT)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (isLayoutValid(parsed)) setLayout(parsed)
      }
    } catch {
      // keep default
    }
    setReady(true)
  }, [storageKey])

  const onLayoutChange = useCallback(
    (next: Layout) => {
      setLayout(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // quota / private mode
      }
    },
    [storageKey],
  )

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_DASHBOARD_LAYOUT)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [storageKey])

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-xl bg-muted/30 lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-xl bg-muted/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto max-w-xl text-xs text-muted-foreground">
          Drag the strip on each block to move it. Drag corners to resize. Layout is saved in this browser.
        </p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={resetLayout}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset layout
        </Button>
      </div>
      <GridWithWidth
        className="-mx-1 min-h-[480px]"
        cols={12}
        rowHeight={28}
        margin={[10, 10]}
        containerPadding={[4, 4]}
        layout={layout}
        onLayoutChange={onLayoutChange}
        draggableHandle=".dashboard-widget-drag"
        compactType="vertical"
        isDraggable
        isResizable
        useCSSTransforms
      >
        <div key="stats" className="h-full min-h-0">
          <DragStrip label="Overview stats" />
          <div className="min-h-0 overflow-auto pr-1">
            <StatsCards stats={stats} />
          </div>
        </div>

        <div key="standardAttraction" className="h-full min-h-0">
          <DragStrip label="Standard of Attraction" />
          <Card className="overflow-hidden border-gold/35 bg-gradient-to-r from-gold/[0.08] via-amber-500/[0.04] to-transparent shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 font-serif text-lg text-gold md:text-xl">
                  <span className="rounded-lg border border-gold/30 bg-gold/10 p-2">
                    <Heart className="h-5 w-5" aria-hidden />
                  </span>
                  Standard of Attraction
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm">
                  Pro-only rating of how commercially attractive your latest photos and videos are, through the eyes of
                  Venus and Circe.
                </CardDescription>
              </div>
              <Button
                asChild
                size="sm"
                className="shrink-0 bg-gradient-to-r from-circe to-venus text-white hover:opacity-90"
              >
                <Link href="/dashboard/ai-studio/tools/standard-of-attraction">Open Pro Tool</Link>
              </Button>
            </CardHeader>
          </Card>
        </div>

        <div key="revenue" className="h-full min-h-0">
          <DragStrip label="Revenue" />
          <div className="min-h-0 overflow-auto pr-1">
            <RevenueChart analytics={analytics} hasConnectedPlatforms={hasConnectedPlatforms} />
          </div>
        </div>

        <div key="quickColumn" className="flex h-full min-h-0 flex-col gap-4">
          <DragStrip label="Platforms & actions" />
          <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
            <PlatformIntegrationWidget compact />
            <QuickActions />
          </div>
        </div>

        <div key="messageActivity" className="h-full min-h-0">
          <DragStrip label="Conversations" />
          <div className="min-h-0 overflow-auto pr-1">
            <MessageActivity />
          </div>
        </div>

        <div key="alertsColumn" className="flex h-full min-h-0 flex-col gap-4">
          <DragStrip label="Alerts & OnlyFans" />
          <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
            <AlertsWidget leakAlerts={leakAlerts} mentions={mentions} />
            <OnlyFansNotificationsCard />
          </div>
        </div>

        <div key="recentFans" className="h-full min-h-0">
          <DragStrip label="Recent fans" />
          <div className="min-h-0 overflow-auto pr-1">
            <RecentFans fans={fans} totalFans={totalFans} />
          </div>
        </div>

        <div key="socialRep" className="h-full min-h-0">
          <DragStrip label="Social reputation" />
          <div className="min-h-0 overflow-auto pr-1">
            <SocialReputationWidget />
          </div>
        </div>
      </GridWithWidth>
    </div>
  )
}
