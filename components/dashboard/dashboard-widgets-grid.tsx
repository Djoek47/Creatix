'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { cloneLayout, verticalCompactor } from 'react-grid-layout/core'
import { GripVertical, LayoutGrid, RotateCcw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { PlatformIntegrationWidget } from '@/components/dashboard/platform-integration-widget'
import { SocialReputationWidget } from '@/components/dashboard/social-reputation-widget'
import { OnlyFansNotificationsCard } from '@/components/dashboard/onlyfans-notifications-card'
import { MessageActivity } from '@/components/dashboard/message-activity'
import { DashboardAegisWidget } from '@/components/dashboard/dashboard-aegis-widget'
import { DashboardFeaturedToolWidget } from '@/components/dashboard/dashboard-featured-tool-widget'
import { pixelsToGridH } from '@/lib/dashboard/grid-metrics'
import { DEFAULT_FEATURED_TOOL_ID, listFeaturedToolCandidates } from '@/lib/dashboard/featured-tool-options'
import { getToolMeta } from '@/lib/ai-tools-data'

const STORAGE_LAYOUT = 'circe-dashboard-layout-v1'
const STORAGE_VISIBLE = 'circe-dashboard-widgets-visible-v1'
const STORAGE_FEATURED_TOOL = 'circe-dashboard-featured-tool-v1'

const COLS = 12

/** Full template; optional widgets (e.g. aegis) are filtered by visibility before render. */
export const DEFAULT_DASHBOARD_LAYOUT: Layout = [
  { i: 'stats', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
  { i: 'standardAttraction', x: 0, y: 4, w: 12, h: 3, minW: 4, minH: 2 },
  { i: 'revenue', x: 0, y: 7, w: 8, h: 7, minW: 4, minH: 4 },
  { i: 'quickColumn', x: 8, y: 7, w: 4, h: 7, minW: 3, minH: 5 },
  { i: 'messageActivity', x: 0, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'alertsColumn', x: 4, y: 14, w: 8, h: 6, minW: 4, minH: 4 },
  { i: 'recentFans', x: 0, y: 20, w: 12, h: 5, minW: 6, minH: 4 },
  { i: 'socialRep', x: 0, y: 25, w: 12, h: 5, minW: 6, minH: 3 },
  { i: 'aegis', x: 0, y: 30, w: 6, h: 4, minW: 4, minH: 3 },
]

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  stats: true,
  standardAttraction: true,
  revenue: true,
  quickColumn: true,
  messageActivity: true,
  alertsColumn: true,
  recentFans: true,
  socialRep: true,
  aegis: false,
}

const WIDGET_OPTIONS: { id: string; label: string; hint?: string; optional?: boolean }[] = [
  { id: 'stats', label: 'Overview stats' },
  {
    id: 'standardAttraction',
    label: 'Featured AI Studio tool',
    hint: 'Pin any runnable tool; pick below the grip.',
  },
  { id: 'revenue', label: 'Revenue chart' },
  { id: 'quickColumn', label: 'Platforms & quick actions' },
  { id: 'messageActivity', label: 'Conversations' },
  { id: 'alertsColumn', label: 'Alerts & OnlyFans' },
  { id: 'recentFans', label: 'Recent fans' },
  { id: 'socialRep', label: 'Social reputation' },
  { id: 'aegis', label: 'Circe Aegis', hint: 'Protection / leak scans', optional: true },
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

function layoutForVisible(visible: Record<string, boolean>, baseLayout: Layout): Layout {
  const allowed = new Set(
    DEFAULT_DASHBOARD_LAYOUT.map((l) => l.i).filter((id) => visible[id] !== false),
  )
  let items = baseLayout.filter((l) => allowed.has(l.i))
  for (const id of allowed) {
    if (!items.some((l) => l.i === id)) {
      const def = DEFAULT_DASHBOARD_LAYOUT.find((l) => l.i === id)
      if (def) items.push({ ...def })
    }
  }
  items = items.filter((l) => allowed.has(l.i))
  return verticalCompactor.compact(cloneLayout(items), COLS)
}

const GridWithWidth = WidthProvider(GridLayout)

function DragStrip({ label }: { label: string }) {
  return (
    <div className="dashboard-widget-drag flex h-9 shrink-0 cursor-grab touch-none select-none items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 text-muted-foreground active:cursor-grabbing">
      <GripVertical className="pointer-events-none h-4 w-4 shrink-0" aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
    </div>
  )
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="box-border flex w-full min-w-0 flex-col gap-2 rounded-xl border border-border/35 bg-card/25 p-2 shadow-sm">
      {children}
    </div>
  )
}

/** Measures natural height and bumps the grid item's `h` so tiles grow with content (no inner scrollbars). */
const DashboardGridMeasuredItem = forwardRef<
  HTMLDivElement,
  {
    id: string
    patchH: (widgetId: string, nextH: number) => void
    skipPatchRef: MutableRefObject<boolean>
    children: React.ReactNode
  }
>(function DashboardGridMeasuredItem({ id, patchH, skipPatchRef, children }, forwardedRef) {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const patchRef = useRef(patchH)
  patchRef.current = patchH

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLDivElement | null>).current = node
    },
    [forwardedRef],
  )

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    let t: ReturnType<typeof setTimeout> | null = null
    const measure = () => {
      if (skipPatchRef.current) return
      const px = el.scrollHeight
      const nextH = pixelsToGridH(px)
      patchRef.current(id, nextH)
    }
    const ro = new ResizeObserver(() => {
      if (skipPatchRef.current) return
      if (t) clearTimeout(t)
      t = setTimeout(measure, 72)
    })
    ro.observe(el)
    measure()
    return () => {
      ro.disconnect()
      if (t) clearTimeout(t)
    }
  }, [id, skipPatchRef])

  return (
    <div ref={setRef} className="dashboard-grid-cell box-border h-full w-full min-w-0">
      {children}
    </div>
  )
})

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
  const layoutKey = `${STORAGE_LAYOUT}:${userId}`
  const visibleKey = `${STORAGE_VISIBLE}:${userId}`
  const featuredToolKey = `${STORAGE_FEATURED_TOOL}:${userId}`

  const [layout, setLayout] = useState<Layout>(() =>
    verticalCompactor.compact(cloneLayout(DEFAULT_DASHBOARD_LAYOUT.filter((l) => DEFAULT_VISIBILITY[l.i] !== false)), COLS),
  )
  const [visible, setVisible] = useState<Record<string, boolean>>({ ...DEFAULT_VISIBILITY })
  const [ready, setReady] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [featuredToolId, setFeaturedToolIdState] = useState(DEFAULT_FEATURED_TOOL_ID)
  /** Pause auto-height patching while dragging or resizing so RGL + ResizeObserver do not fight. */
  const interactionLockRef = useRef(false)

  const setFeaturedToolId = useCallback(
    (id: string) => {
      const allowed = new Set(listFeaturedToolCandidates().map((t) => t.id))
      if (!allowed.has(id)) return
      setFeaturedToolIdState(id)
      try {
        localStorage.setItem(featuredToolKey, id)
      } catch {
        // ignore
      }
    },
    [featuredToolKey],
  )

  useEffect(() => {
    try {
      let vis = { ...DEFAULT_VISIBILITY }
      const rawVis = typeof window !== 'undefined' ? localStorage.getItem(visibleKey) : null
      if (rawVis) {
        const parsed = JSON.parse(rawVis) as Record<string, unknown>
        if (parsed && typeof parsed === 'object') {
          vis = { ...DEFAULT_VISIBILITY, ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, Boolean(v)])) }
        }
      }

      const rawLayout = typeof window !== 'undefined' ? localStorage.getItem(layoutKey) : null
      let nextLayout: Layout
      if (rawLayout) {
        const parsed = JSON.parse(rawLayout) as unknown
        nextLayout = isLayoutValid(parsed) ? parsed : layoutForVisible(vis, DEFAULT_DASHBOARD_LAYOUT)
      } else {
        nextLayout = layoutForVisible(vis, DEFAULT_DASHBOARD_LAYOUT)
      }
      nextLayout = layoutForVisible(vis, nextLayout)
      setVisible(vis)
      setLayout(nextLayout)

      const allowedTools = new Set(listFeaturedToolCandidates().map((t) => t.id))
      const rawFt = typeof window !== 'undefined' ? localStorage.getItem(featuredToolKey) : null
      if (rawFt && allowedTools.has(rawFt)) {
        setFeaturedToolIdState(rawFt)
      } else {
        setFeaturedToolIdState(DEFAULT_FEATURED_TOOL_ID)
      }
    } catch {
      setLayout(layoutForVisible(DEFAULT_VISIBILITY, DEFAULT_DASHBOARD_LAYOUT))
      setFeaturedToolIdState(DEFAULT_FEATURED_TOOL_ID)
    }
    setReady(true)
  }, [layoutKey, visibleKey, featuredToolKey])

  const persistVisible = useCallback(
    (next: Record<string, boolean>) => {
      try {
        localStorage.setItem(visibleKey, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [visibleKey],
  )

  const onLayoutChange = useCallback(
    (next: Layout) => {
      setLayout(next)
      try {
        localStorage.setItem(layoutKey, JSON.stringify(next))
      } catch {
        // quota / private mode
      }
    },
    [layoutKey],
  )

  const resetLayout = useCallback(() => {
    const next = layoutForVisible(visible, DEFAULT_DASHBOARD_LAYOUT)
    setLayout(next)
    try {
      localStorage.setItem(layoutKey, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [layoutKey, visible])

  const resetAll = useCallback(() => {
    setVisible({ ...DEFAULT_VISIBILITY })
    persistVisible(DEFAULT_VISIBILITY)
    const next = layoutForVisible(DEFAULT_VISIBILITY, DEFAULT_DASHBOARD_LAYOUT)
    setLayout(next)
    setFeaturedToolIdState(DEFAULT_FEATURED_TOOL_ID)
    try {
      localStorage.setItem(layoutKey, JSON.stringify(next))
      localStorage.setItem(featuredToolKey, DEFAULT_FEATURED_TOOL_ID)
    } catch {
      // ignore
    }
  }, [layoutKey, persistVisible, featuredToolKey])

  const setWidgetVisible = useCallback(
    (id: string, checked: boolean) => {
      setVisible((prev) => {
        const next = { ...prev, [id]: checked }
        persistVisible(next)
        setLayout((prevLayout) => {
          const merged = layoutForVisible(next, prevLayout)
          try {
            localStorage.setItem(layoutKey, JSON.stringify(merged))
          } catch {
            // ignore
          }
          return merged
        })
        return next
      })
    },
    [layoutKey, persistVisible],
  )

  const patchItemH = useCallback((widgetId: string, nextH: number) => {
    if (interactionLockRef.current) return
    setLayout((prev) => {
      const cur = prev.find((l) => l.i === widgetId)
      if (!cur) return prev
      const def = DEFAULT_DASHBOARD_LAYOUT.find((l) => l.i === widgetId)
      const minH = cur.minH ?? def?.minH ?? 1
      const maxH = cur.maxH ?? def?.maxH ?? 80
      const h = Math.max(minH, Math.min(maxH, nextH))
      if (h === cur.h) return prev
      const next = prev.map((l) => (l.i === widgetId ? { ...l, h } : l))
      return verticalCompactor.compact(cloneLayout(next), COLS)
    })
  }, [])

  const widgetBody = useMemo(() => {
    const map: Record<string, React.ReactNode> = {
      stats: (
        <WidgetShell>
          <DragStrip label="Overview stats" />
          <div className="w-full min-w-0">
            <StatsCards stats={stats} />
          </div>
        </WidgetShell>
      ),
      standardAttraction: (
        <WidgetShell>
          <DragStrip label={getToolMeta(featuredToolId)?.name ?? 'Featured tool'} />
          <div className="w-full min-w-0">
            <DashboardFeaturedToolWidget toolId={featuredToolId} onToolIdChange={setFeaturedToolId} />
          </div>
        </WidgetShell>
      ),
      revenue: (
        <WidgetShell>
          <DragStrip label="Revenue" />
          <div className="w-full min-w-0">
            <RevenueChart analytics={analytics} hasConnectedPlatforms={hasConnectedPlatforms} />
          </div>
        </WidgetShell>
      ),
      quickColumn: (
        <WidgetShell>
          <div className="flex w-full min-w-0 flex-col gap-2">
            <DragStrip label="Platforms & actions" />
            <div className="w-full min-w-0 space-y-4">
              <PlatformIntegrationWidget compact />
              <QuickActions />
            </div>
          </div>
        </WidgetShell>
      ),
      messageActivity: (
        <WidgetShell>
          <DragStrip label="Conversations" />
          <div className="w-full min-w-0">
            <MessageActivity />
          </div>
        </WidgetShell>
      ),
      alertsColumn: (
        <WidgetShell>
          <div className="flex w-full min-w-0 flex-col gap-2">
            <DragStrip label="Alerts & OnlyFans" />
            <div className="w-full min-w-0 space-y-4">
              <AlertsWidget leakAlerts={leakAlerts} mentions={mentions} />
              <OnlyFansNotificationsCard />
            </div>
          </div>
        </WidgetShell>
      ),
      recentFans: (
        <WidgetShell>
          <DragStrip label="Recent fans" />
          <div className="w-full min-w-0">
            <RecentFans fans={fans} totalFans={totalFans} />
          </div>
        </WidgetShell>
      ),
      socialRep: (
        <WidgetShell>
          <DragStrip label="Social reputation" />
          <div className="w-full min-w-0">
            <SocialReputationWidget />
          </div>
        </WidgetShell>
      ),
      aegis: (
        <WidgetShell>
          <DragStrip label="Circe Aegis" />
          <div className="w-full min-w-0">
            <DashboardAegisWidget />
          </div>
        </WidgetShell>
      ),
    }
    return map
  }, [stats, analytics, hasConnectedPlatforms, fans, totalFans, leakAlerts, mentions, featuredToolId, setFeaturedToolId])

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

  const orderedIds = WIDGET_OPTIONS.map((w) => w.id).filter((id) => visible[id] !== false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto max-w-xl text-xs text-muted-foreground">
          Drag the grip strip to move a block; drag the right edge to resize width. The featured tool block can pin any
          runnable AI Studio tool (dropdown). Height grows with content. Layout and choices are saved in this browser.
        </p>
        <Popover open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="secondary" size="sm" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Customize
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="border-b border-border/60 px-3 py-2.5">
              <p className="text-sm font-medium">Dashboard sections</p>
              <p className="text-xs text-muted-foreground">Show or hide widgets. Aegis opens the protection hub.</p>
            </div>
            <div className="max-h-[min(60vh,420px)] space-y-0 overflow-y-auto px-3 py-2">
              {WIDGET_OPTIONS.map((w) => (
                <div key={w.id}>
                  <Label className="flex cursor-pointer items-start gap-3 rounded-md py-2 hover:bg-muted/40">
                    <Checkbox
                      checked={visible[w.id] !== false}
                      onCheckedChange={(v) => setWidgetVisible(w.id, v === true)}
                      className="mt-0.5"
                    />
                    <span className="grid gap-0.5">
                      <span className="flex items-center gap-1.5 text-sm leading-tight">
                        {w.id === 'aegis' ? <Shield className="h-3.5 w-3.5 text-circe" aria-hidden /> : null}
                        {w.label}
                        {w.optional ? (
                          <span className="text-[10px] font-normal uppercase text-muted-foreground">optional</span>
                        ) : null}
                      </span>
                      {w.hint ? <span className="text-[11px] font-normal text-muted-foreground">{w.hint}</span> : null}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-end gap-2 px-3 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetAll}>
                Reset sections
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={resetLayout}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset layout
        </Button>
      </div>

      {/* Width handle only: height stays content-driven via ResizeObserver (corner/south handles would fight h). */}
      <GridWithWidth
        className="dashboard-widgets-grid -mx-1 min-h-[400px]"
        measureBeforeMount
        cols={COLS}
        rowHeight={30}
        margin={[18, 18]}
        containerPadding={[8, 8]}
        layout={layout}
        onLayoutChange={onLayoutChange}
        draggableHandle=".dashboard-widget-drag"
        draggableCancel=".dashboard-featured-tool-picker"
        compactType="vertical"
        isDraggable
        isResizable
        resizeHandles={['e']}
        useCSSTransforms
        onDragStart={() => {
          interactionLockRef.current = true
        }}
        onDragStop={() => {
          interactionLockRef.current = false
        }}
        onResizeStart={() => {
          interactionLockRef.current = true
        }}
        onResizeStop={() => {
          interactionLockRef.current = false
        }}
      >
        {orderedIds.map((id) => (
          <DashboardGridMeasuredItem key={id} id={id} patchH={patchItemH} skipPatchRef={interactionLockRef}>
            {widgetBody[id]}
          </DashboardGridMeasuredItem>
        ))}
      </GridWithWidth>
    </div>
  )
}
