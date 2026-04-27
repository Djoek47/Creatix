'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Reorder, useReducedMotion, motion } from 'framer-motion'
import { Columns2, GripVertical, LayoutGrid, RotateCcw, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
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
import { DEFAULT_FEATURED_TOOL_ID, listFeaturedToolCandidates } from '@/lib/dashboard/featured-tool-options'
import { mergeDashboardVisibility } from '@/lib/dashboard/dashboard-preset'
import { getToolMeta } from '@/lib/ai-tools-data'
import { cn } from '@/lib/utils'
import type { DivineDashboardPreset } from '@/lib/divine-manager'

const STORAGE_VISIBLE = 'circe-dashboard-widgets-visible-v1'
const STORAGE_FEATURED_TOOL = 'circe-dashboard-featured-tool-v1'
const STORAGE_SECTION_ORDER = 'circe-dashboard-section-order-v2'
const STORAGE_PANELS = 'circe-dashboard-panels-v2'
const STORAGE_SPLIT_ANCHORS = 'circe-dashboard-split-anchors-v1'

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
    hint: 'Pin any runnable tool from the card below.',
  },
  { id: 'revenue', label: 'Revenue chart' },
  { id: 'quickColumn', label: 'Platforms & quick actions' },
  { id: 'messageActivity', label: 'Conversations' },
  { id: 'alertsColumn', label: 'Alerts · OnlyFans & Fansly' },
  { id: 'recentFans', label: 'Recent fans' },
  { id: 'socialRep', label: 'Social hub (summary)', hint: 'Full scans and handles live on Social.' },
  { id: 'aegis', label: 'Circe Aegis', hint: 'Protection / leak scans', optional: true },
]

const SECTION_ORDER_DEFAULT = [
  'stats',
  'standardAttraction',
  'revenue',
  'quickColumn',
  'messageActivity',
  'alertsColumn',
  'recentFans',
  'socialRep',
  'aegis',
] as const

type SectionId = (typeof SECTION_ORDER_DEFAULT)[number]

const isSectionId = (s: string): s is SectionId =>
  (SECTION_ORDER_DEFAULT as readonly string[]).includes(s)

/** Map legacy + migrate `revenueDuo` to two free sections. */
function normalizeSavedOrder(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return raw ?? []
  const next: string[] = []
  for (const x of raw) {
    if (x === 'revenueDuo') {
      next.push('revenue', 'quickColumn')
    } else if (x === 'engageDuo') {
      next.push('messageActivity', 'alertsColumn')
    } else {
      next.push(x)
    }
  }
  return next
}

type PanelState = { main: [number, number]; engage: [number, number]; custom: Record<string, [number, number]> }
const PANEL_DEFAULT: PanelState = { main: [58, 42], engage: [50, 50], custom: {} }

type LayoutSegment =
  | { type: 'single'; id: SectionId }
  | { type: 'rqPair'; first: 'revenue' | 'quickColumn' }
  | { type: 'engagePair'; left: SectionId; right: SectionId }
  | { type: 'customPair'; left: SectionId; right: SectionId }

function sectionVisible(id: SectionId, visible: Record<string, boolean>): boolean {
  if (id === 'stats') return visible.stats !== false
  if (id === 'standardAttraction') return visible.standardAttraction !== false
  if (id === 'revenue') return visible.revenue !== false
  if (id === 'quickColumn') return visible.quickColumn !== false
  if (id === 'messageActivity') return visible.messageActivity !== false
  if (id === 'alertsColumn') return visible.alertsColumn !== false
  if (id === 'recentFans') return visible.recentFans !== false
  if (id === 'socialRep') return visible.socialRep !== false
  if (id === 'aegis') return visible.aegis === true
  return false
}

function isRevenueQuickPair(a: SectionId, b: SectionId, visible: Record<string, boolean>): boolean {
  if (!sectionVisible('revenue', visible) || !sectionVisible('quickColumn', visible)) return false
  return (a === 'revenue' && b === 'quickColumn') || (a === 'quickColumn' && b === 'revenue')
}

function isEngageAdjacentPair(a: SectionId, b: SectionId, visible: Record<string, boolean>): boolean {
  if (!sectionVisible('messageActivity', visible) || !sectionVisible('alertsColumn', visible)) return false
  return (
    (a === 'messageActivity' && b === 'alertsColumn') || (a === 'alertsColumn' && b === 'messageActivity')
  )
}

function pairStorageKey(left: SectionId, right: SectionId): string {
  return `${left}::${right}`
}

function reconcileSplitAnchors(order: SectionId[], anchors: SectionId[]): SectionId[] {
  return anchors.filter((a) => {
    const i = order.indexOf(a)
    return i >= 0 && i < order.length - 1
  })
}

/** Built-in pairs (revenue+platforms, conversations+alerts) plus optional user “split row” anchors. */
function orderToSegments(
  order: SectionId[],
  visible: Record<string, boolean>,
  splitAnchors: Set<SectionId>,
): LayoutSegment[] {
  const out: LayoutSegment[] = []
  let i = 0
  while (i < order.length) {
    const a = order[i]!
    const b = order[i + 1]
    if (b !== undefined && isRevenueQuickPair(a, b, visible)) {
      out.push({ type: 'rqPair', first: a === 'revenue' ? 'revenue' : 'quickColumn' })
      i += 2
      continue
    }
    if (b !== undefined && isEngageAdjacentPair(a, b, visible)) {
      out.push({ type: 'engagePair', left: a, right: b })
      i += 2
      continue
    }
    if (
      b !== undefined &&
      splitAnchors.has(a) &&
      sectionVisible(a, visible) &&
      sectionVisible(b, visible) &&
      !isRevenueQuickPair(a, b, visible) &&
      !isEngageAdjacentPair(a, b, visible)
    ) {
      out.push({ type: 'customPair', left: a, right: b })
      i += 2
      continue
    }
    out.push({ type: 'single', id: a })
    i += 1
  }
  return out
}

function mergeOrder(saved: string[] | null, visible: Record<string, boolean>): SectionId[] {
  const canShow = (id: SectionId) => sectionVisible(id, visible)

  const needed = (SECTION_ORDER_DEFAULT as readonly SectionId[]).filter((id) => canShow(id))
  if (needed.length === 0) return []

  const norm = normalizeSavedOrder(saved)
  const raw = norm.filter((x) => isSectionId(x) && canShow(x as SectionId)) as SectionId[] | undefined
  const seen = new Set<SectionId>()
  const out: SectionId[] = []
  for (const id of raw ?? []) {
    if (canShow(id) && !seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  for (const id of needed) {
    if (!seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  return out
}

function DashboardModule({ className, children, heading }: { className?: string; children: React.ReactNode; heading?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/95 via-card/80 to-card/50 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[box-shadow,transform] duration-300',
        'dark:from-card/90 dark:via-card/70 dark:to-card/45',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-overlay dark:opacity-[0.35]"
        style={{
          background:
            'radial-gradient(120% 80% at 10% 0%, rgba(251, 191, 36, 0.08) 0%, transparent 50%), radial-gradient(100% 60% at 100% 0%, rgba(168, 85, 247, 0.1) 0%, transparent 55%)',
        }}
        aria-hidden
      />
      {heading ? (
        <div className="relative border-b border-border/35 px-3 py-2 md:px-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{heading}</p>
        </div>
      ) : null}
      <div className="relative p-3 md:p-4">{children}</div>
    </div>
  )
}

export type DashboardWidgetsGridProps = {
  userId: string
  dashboardPreset?: DivineDashboardPreset | null
  stats: React.ComponentProps<typeof StatsCards>['stats']
  analytics: React.ComponentProps<typeof RevenueChart>['analytics']
  hasConnectedPlatforms: boolean
  connectedOnlyFans?: boolean
  connectedFansly?: boolean
  fans: React.ComponentProps<typeof RecentFans>['fans']
  totalFans: number
  leakAlerts: React.ComponentProps<typeof AlertsWidget>['leakAlerts']
  mentions: React.ComponentProps<typeof AlertsWidget>['mentions']
}

export function DashboardWidgetsGrid({
  userId,
  dashboardPreset = null,
  stats,
  analytics,
  hasConnectedPlatforms,
  connectedOnlyFans = false,
  connectedFansly = false,
  fans,
  totalFans,
  leakAlerts,
  mentions,
}: DashboardWidgetsGridProps) {
  const visibleKey = `${STORAGE_VISIBLE}:${userId}`
  const featuredToolKey = `${STORAGE_FEATURED_TOOL}:${userId}`
  const orderKey = `${STORAGE_SECTION_ORDER}:${userId}`
  const panelKey = `${STORAGE_PANELS}:${userId}`
  const splitKey = `${STORAGE_SPLIT_ANCHORS}:${userId}`

  const [visible, setVisible] = useState<Record<string, boolean>>({ ...DEFAULT_VISIBILITY })
  const [ready, setReady] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>([...SECTION_ORDER_DEFAULT])
  const [panelState, setPanelState] = useState<PanelState>(PANEL_DEFAULT)
  const [splitAnchorsList, setSplitAnchorsList] = useState<SectionId[]>([])
  const [customize, setCustomize] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [featuredToolId, setFeaturedToolIdState] = useState(DEFAULT_FEATURED_TOOL_ID)
  const reduceMotion = useReducedMotion()

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

  const persistOrder = useCallback(
    (next: SectionId[]) => {
      try {
        localStorage.setItem(orderKey, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [orderKey],
  )

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

  const persistSplitAnchors = useCallback(
    (next: SectionId[]) => {
      try {
        localStorage.setItem(splitKey, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [splitKey],
  )

  const splitAnchors = useMemo(() => new Set(splitAnchorsList), [splitAnchorsList])

  useEffect(() => {
    try {
      let localVis: Record<string, boolean> | null = null
      const rawVis = typeof window !== 'undefined' ? localStorage.getItem(visibleKey) : null
      if (rawVis) {
        const parsed = JSON.parse(rawVis) as Record<string, unknown>
        if (parsed && typeof parsed === 'object') {
          localVis = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, Boolean(v)]))
        }
      }

      const vis = mergeDashboardVisibility(DEFAULT_VISIBILITY, dashboardPreset?.widgetVisibility, localVis)
      setVisible(vis)

      const rawOrder = typeof window !== 'undefined' ? localStorage.getItem(orderKey) : null
      let parsedOrder: string[] | null = null
      if (rawOrder) {
        const p = JSON.parse(rawOrder) as unknown
        if (Array.isArray(p)) parsedOrder = p as string[]
      }
      const hasLegacyDuo = parsedOrder?.some((x) => x === 'revenueDuo' || x === 'engageDuo') ?? false
      const mergedOrder = mergeOrder(parsedOrder, vis)
      setSectionOrder(mergedOrder)
      if (hasLegacyDuo) {
        try {
          localStorage.setItem(orderKey, JSON.stringify(mergedOrder))
        } catch {
          // ignore
        }
      }

      const rawSplit = typeof window !== 'undefined' ? localStorage.getItem(splitKey) : null
      if (rawSplit) {
        try {
          const sp = JSON.parse(rawSplit) as unknown
          if (Array.isArray(sp)) {
            const cleaned = reconcileSplitAnchors(
              mergedOrder,
              sp.filter((x): x is SectionId => typeof x === 'string' && isSectionId(x)),
            )
            setSplitAnchorsList(cleaned)
          } else {
            setSplitAnchorsList([])
          }
        } catch {
          setSplitAnchorsList([])
        }
      } else {
        setSplitAnchorsList([])
      }

      const rawPanels = typeof window !== 'undefined' ? localStorage.getItem(panelKey) : null
      if (rawPanels) {
        const p = JSON.parse(rawPanels) as Partial<PanelState>
        if (p?.main && p?.engage) {
          const custom =
            p.custom && typeof p.custom === 'object' && !Array.isArray(p.custom)
              ? (p.custom as Record<string, [number, number]>)
              : {}
          setPanelState({
            main: p.main as [number, number],
            engage: p.engage as [number, number],
            custom,
          })
        }
      }

      const allowedTools = new Set(listFeaturedToolCandidates().map((t) => t.id))
      const rawFt = typeof window !== 'undefined' ? localStorage.getItem(featuredToolKey) : null
      if (rawFt && allowedTools.has(rawFt)) {
        setFeaturedToolIdState(rawFt)
      } else if (dashboardPreset?.featuredToolId && allowedTools.has(dashboardPreset.featuredToolId)) {
        setFeaturedToolIdState(dashboardPreset.featuredToolId)
      } else {
        setFeaturedToolIdState(DEFAULT_FEATURED_TOOL_ID)
      }
    } catch {
      setVisible({ ...DEFAULT_VISIBILITY })
      setSectionOrder(mergeOrder(null, DEFAULT_VISIBILITY))
      setSplitAnchorsList([])
    }
    setReady(true)
  }, [visibleKey, orderKey, panelKey, splitKey, featuredToolKey, dashboardPreset])

  const setWidgetVisible = useCallback(
    (id: string, checked: boolean) => {
      setVisible((prev) => {
        const next = { ...prev, [id]: checked }
        persistVisible(next)
        const ord = mergeOrder(null, next)
        setSectionOrder(ord)
        try {
          localStorage.setItem(orderKey, JSON.stringify(ord))
        } catch {
          // ignore
        }
        return next
      })
    },
    [persistVisible, orderKey],
  )

  const resetLayout = useCallback(() => {
    const next = mergeOrder([...SECTION_ORDER_DEFAULT], visible)
    setSectionOrder(next)
    persistOrder(next)
    setSplitAnchorsList([])
    persistSplitAnchors([])
    setPanelState(PANEL_DEFAULT)
    setResetNonce((n) => n + 1)
    try {
      localStorage.setItem(panelKey, JSON.stringify(PANEL_DEFAULT))
    } catch {
      // ignore
    }
  }, [visible, panelKey, persistOrder, persistSplitAnchors])

  const resetAll = useCallback(() => {
    setVisible({ ...DEFAULT_VISIBILITY })
    persistVisible(DEFAULT_VISIBILITY)
    setSectionOrder(mergeOrder([...SECTION_ORDER_DEFAULT], DEFAULT_VISIBILITY))
    persistOrder(mergeOrder([...SECTION_ORDER_DEFAULT], DEFAULT_VISIBILITY))
    setPanelState(PANEL_DEFAULT)
    setSplitAnchorsList([])
    persistSplitAnchors([])
    setResetNonce((n) => n + 1)
    setFeaturedToolIdState(DEFAULT_FEATURED_TOOL_ID)
    try {
      localStorage.setItem(panelKey, JSON.stringify(PANEL_DEFAULT))
      localStorage.setItem(featuredToolKey, DEFAULT_FEATURED_TOOL_ID)
    } catch {
      // ignore
    }
  }, [panelKey, persistVisible, featuredToolKey, persistOrder, persistSplitAnchors])

  const resetToDivinePreset = useCallback(() => {
    const vis = mergeDashboardVisibility(DEFAULT_VISIBILITY, dashboardPreset?.widgetVisibility, null)
    setVisible(vis)
    persistVisible(vis)
    setSectionOrder(mergeOrder([...SECTION_ORDER_DEFAULT], vis))
    persistOrder(mergeOrder([...SECTION_ORDER_DEFAULT], vis))
    setPanelState(PANEL_DEFAULT)
    setSplitAnchorsList([])
    persistSplitAnchors([])
    setResetNonce((n) => n + 1)
    const allowedTools = new Set(listFeaturedToolCandidates().map((t) => t.id))
    const ft =
      dashboardPreset?.featuredToolId && allowedTools.has(dashboardPreset.featuredToolId)
        ? dashboardPreset.featuredToolId
        : DEFAULT_FEATURED_TOOL_ID
    setFeaturedToolIdState(ft)
    try {
      localStorage.setItem(panelKey, JSON.stringify(PANEL_DEFAULT))
      localStorage.setItem(visibleKey, JSON.stringify(vis))
      localStorage.setItem(featuredToolKey, ft)
    } catch {
      // ignore
    }
  }, [dashboardPreset, panelKey, visibleKey, featuredToolKey, persistVisible, persistOrder, persistSplitAnchors])

  const onReorder = useCallback(
    (next: SectionId[]) => {
      setSectionOrder(next)
      persistOrder(next)
      setSplitAnchorsList((prev) => {
        const cleaned = reconcileSplitAnchors(next, prev)
        persistSplitAnchors(cleaned)
        return cleaned
      })
    },
    [persistOrder, persistSplitAnchors],
  )

  const onMainLayout = useCallback(
    (sizes: number[]) => {
      if (sizes.length < 2) return
      const a = Math.round(sizes[0] * 10) / 10
      const b = Math.round(sizes[1] * 10) / 10
      setPanelState((prev) => {
        const n: PanelState = { ...prev, main: [a, b] }
        try {
          localStorage.setItem(panelKey, JSON.stringify(n))
        } catch {
          // ignore
        }
        return n
      })
    },
    [panelKey],
  )

  const onEngageLayout = useCallback(
    (sizes: number[]) => {
      if (sizes.length < 2) return
      const a = Math.round(sizes[0] * 10) / 10
      const b = Math.round(sizes[1] * 10) / 10
      setPanelState((prev) => {
        const n: PanelState = { ...prev, engage: [a, b] }
        try {
          localStorage.setItem(panelKey, JSON.stringify(n))
        } catch {
          // ignore
        }
        return n
      })
    },
    [panelKey],
  )

  const onCustomLayout = useCallback(
    (left: SectionId, right: SectionId) => (sizes: number[]) => {
      if (sizes.length < 2) return
      const a = Math.round(sizes[0] * 10) / 10
      const b = Math.round(sizes[1] * 10) / 10
      const k = pairStorageKey(left, right)
      setPanelState((prev) => {
        const n: PanelState = { ...prev, custom: { ...prev.custom, [k]: [a, b] } }
        try {
          localStorage.setItem(panelKey, JSON.stringify(n))
        } catch {
          // ignore
        }
        return n
      })
    },
    [panelKey],
  )

  useEffect(() => {
    if (!ready) return
    setSplitAnchorsList((prev) => {
      const cleaned = reconcileSplitAnchors(sectionOrder, prev)
      const same = cleaned.length === prev.length && cleaned.every((x, i) => x === prev[i])
      if (same) return prev
      persistSplitAnchors(cleaned)
      return cleaned
    })
  }, [sectionOrder, ready, persistSplitAnchors])

  const widgetBody = useMemo(() => {
    return {
      stats: (
        <DashboardModule heading="Signal overview">
          <StatsCards stats={stats} />
        </DashboardModule>
      ),
      standardAttraction: (
        <DashboardModule heading={getToolMeta(featuredToolId)?.name ?? 'Featured tool'}>
          <DashboardFeaturedToolWidget toolId={featuredToolId} onToolIdChange={setFeaturedToolId} />
        </DashboardModule>
      ),
      recentFans: (
        <DashboardModule heading="Recent fans">
          <RecentFans fans={fans} totalFans={totalFans} />
        </DashboardModule>
      ),
      socialRep: (
        <DashboardModule heading="Social & reputation">
          <SocialReputationWidget variant="compact" />
        </DashboardModule>
      ),
      aegis: (
        <DashboardModule heading="Circe Aegis">
          <DashboardAegisWidget />
        </DashboardModule>
      ),
    }
  }, [stats, fans, totalFans, featuredToolId, setFeaturedToolId])

  const quickColumnBody = useMemo(
    () => (
      <div className="space-y-4">
        <PlatformIntegrationWidget compact />
        <QuickActions />
      </div>
    ),
    [],
  )

  const alertsStack = useMemo(
    () => (
      <div className="space-y-4">
        <AlertsWidget leakAlerts={leakAlerts} mentions={mentions} />
        <OnlyFansNotificationsCard />
      </div>
    ),
    [leakAlerts, mentions],
  )

  const renderRevenueSolo = () => (
    <div className="w-full">
      <DashboardModule heading="Revenue & rhythm">
        <RevenueChart
          analytics={analytics}
          hasConnectedPlatforms={hasConnectedPlatforms}
          connectedOnlyFans={connectedOnlyFans}
          connectedFansly={connectedFansly}
        />
      </DashboardModule>
    </div>
  )

  const renderQuickSolo = () => (
    <div className="w-full">
      <DashboardModule heading="Platforms & quick actions">{quickColumnBody}</DashboardModule>
    </div>
  )

  const renderRqPair = (first: 'revenue' | 'quickColumn') => {
    const v = visible
    const showR = v.revenue !== false
    const showQ = v.quickColumn !== false
    if (!showR || !showQ) return null
    const [a, b] = panelState.main
    const revenueBlock = (
      <DashboardModule heading="Revenue" className="h-full min-h-0">
        <RevenueChart
          analytics={analytics}
          hasConnectedPlatforms={hasConnectedPlatforms}
          connectedOnlyFans={connectedOnlyFans}
          connectedFansly={connectedFansly}
        />
      </DashboardModule>
    )
    const quickBlock = (
      <DashboardModule heading="Platforms & quick actions" className="h-full min-h-0">
        {quickColumnBody}
      </DashboardModule>
    )
    const firstEl = first === 'revenue' ? revenueBlock : quickBlock
    const secondEl = first === 'revenue' ? quickBlock : revenueBlock
    return (
      <div className="w-full min-w-0">
        <div className="flex min-h-0 w-full flex-col gap-4 sm:hidden">
          {firstEl}
          {secondEl}
        </div>
        <div className="hidden min-h-[min(400px,70vh)] w-full min-w-0 sm:block">
          <ResizablePanelGroup
            key={`main-${resetNonce}-${first}`}
            direction="horizontal"
            className="h-full min-h-[280px] w-full min-w-0"
            onLayout={onMainLayout}
          >
            <ResizablePanel defaultSize={a} minSize={24} className="min-w-0">
              {first === 'revenue' ? revenueBlock : quickBlock}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="group relative w-2 rounded-full border border-amber-500/15 bg-gradient-to-b from-amber-500/15 via-violet-500/10 to-amber-500/10 transition-shadow hover:shadow-[0_0_18px_rgba(168,85,247,0.35)]"
            />
            <ResizablePanel defaultSize={b} minSize={22} className="min-w-0">
              {first === 'revenue' ? quickBlock : revenueBlock}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  const renderSection = (id: SectionId) => {
    switch (id) {
      case 'stats':
        return visible.stats !== false ? widgetBody.stats : null
      case 'standardAttraction':
        return visible.standardAttraction !== false ? widgetBody.standardAttraction : null
      case 'revenue':
        return visible.revenue !== false ? renderRevenueSolo() : null
      case 'quickColumn':
        return visible.quickColumn !== false ? renderQuickSolo() : null
      case 'messageActivity':
        return visible.messageActivity !== false ? (
          <DashboardModule heading="Conversations">
            <MessageActivity />
          </DashboardModule>
        ) : null
      case 'alertsColumn':
        return visible.alertsColumn !== false ? (
          <DashboardModule heading="Alerts · OnlyFans & Fansly">{alertsStack}</DashboardModule>
        ) : null
      case 'recentFans':
        return visible.recentFans !== false ? widgetBody.recentFans : null
      case 'socialRep':
        return visible.socialRep !== false ? widgetBody.socialRep : null
      case 'aegis':
        return visible.aegis === true ? widgetBody.aegis : null
      default:
        return null
    }
  }

  const renderEngagePair = (left: SectionId, right: SectionId) => {
    const showM = visible.messageActivity !== false
    const showA = visible.alertsColumn !== false
    if (!showM || !showA) return null
    const [ea, eb] = panelState.engage
    const messageBlock = (
      <DashboardModule heading="Conversations" className="h-full min-h-0">
        <MessageActivity />
      </DashboardModule>
    )
    const alertsBlock = (
      <DashboardModule heading="Alerts · OnlyFans & Fansly" className="h-full min-h-0">
        {alertsStack}
      </DashboardModule>
    )
    const leftEl = left === 'messageActivity' ? messageBlock : alertsBlock
    const rightEl = right === 'messageActivity' ? messageBlock : alertsBlock
    return (
      <div className="w-full min-w-0">
        <div className="flex w-full min-w-0 flex-col gap-4 sm:hidden">
          {leftEl}
          {rightEl}
        </div>
        <div className="hidden min-h-[min(360px,62vh)] w-full min-w-0 sm:block">
          <ResizablePanelGroup
            key={`engage-${resetNonce}-${left}-${right}`}
            direction="horizontal"
            className="h-full min-h-[260px] w-full min-w-0"
            onLayout={onEngageLayout}
          >
            <ResizablePanel defaultSize={ea} minSize={22} className="min-w-0">
              {leftEl}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="group relative w-2 shrink-0 rounded-full border border-violet-500/15 bg-gradient-to-b from-violet-500/15 via-amber-500/8 to-circe/10 transition-shadow hover:shadow-[0_0_18px_rgba(234,179,8,0.2)]"
            />
            <ResizablePanel defaultSize={eb} minSize={22} className="min-w-0">
              {rightEl}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  const renderCustomPair = (left: SectionId, right: SectionId) => {
    const leftNode = renderSection(left)
    const rightNode = renderSection(right)
    if (!leftNode || !rightNode) return null
    const k = pairStorageKey(left, right)
    const [ca, cb] = panelState.custom[k] ?? [50, 50]
    return (
      <div className="w-full min-w-0">
        <div className="flex w-full min-w-0 flex-col gap-4 sm:hidden">
          <div className="min-w-0">{leftNode}</div>
          <div className="min-w-0">{rightNode}</div>
        </div>
        <div className="hidden min-h-[min(320px,55vh)] w-full min-w-0 sm:block">
          <ResizablePanelGroup
            key={`custom-${resetNonce}-${k}`}
            direction="horizontal"
            className="h-full min-h-[220px] w-full min-w-0"
            onLayout={onCustomLayout(left, right)}
          >
            <ResizablePanel defaultSize={ca} minSize={20} className="min-w-0">
              {leftNode}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="group relative w-2 shrink-0 rounded-full border border-border/45 bg-muted/25 transition-shadow hover:shadow-md"
            />
            <ResizablePanel defaultSize={cb} minSize={20} className="min-w-0">
              {rightNode}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-muted/30 lg:col-span-2" />
        </div>
      </div>
    )
  }

  const listVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.08,
        delayChildren: reduceMotion ? 0 : 0.05,
      },
    },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          <span className="text-foreground/90">Bento layout</span> with smooth motion. Turn on{' '}
          <span className="font-medium text-foreground/90">Layout mode</span> to drag whole sections by the gold grip.
          Put any two adjacent blocks side by side with{' '}
          <span className="font-medium text-foreground/90">Pair with next</span> (below each row).{' '}
          <strong className="font-medium text-foreground/90">Revenue</strong> +{' '}
          <strong className="font-medium text-foreground/90">Platforms</strong> and{' '}
          <strong className="font-medium text-foreground/90">Conversations</strong> +{' '}
          <strong className="font-medium text-foreground/90">Alerts</strong> still auto-pair when they are next to each
          other; drag the slim{' '}
          <span className="whitespace-nowrap text-amber-200/90">gold</span> /{' '}
          <span className="whitespace-nowrap text-violet-200/90">violet</span> bar on medium+ widths to resize. Saved on
          this device.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant={customize ? 'default' : 'secondary'}
            className={cn('gap-1.5', customize && 'bg-gradient-to-r from-amber-600 to-violet-600 text-white shadow-md')}
            onClick={() => setCustomize((c) => !c)}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            {customize ? 'Done' : 'Layout mode'}
          </Button>
          <Popover open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Blocks
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="text-sm font-medium">Visible blocks</p>
                <p className="text-xs text-muted-foreground">Toggle sections, then order them in layout mode.</p>
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
                  Reset all
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={resetLayout}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset order & splits
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5 border-gold/25 bg-gold/[0.06] hover:bg-gold/[0.1]"
            onClick={resetToDivinePreset}
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
            Divine preset
          </Button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-border/30 bg-gradient-to-b from-muted/20 to-transparent p-1 md:p-2">
        {customize ? (
          <Reorder.Group
            axis="y"
            values={sectionOrder}
            onReorder={onReorder}
            className="flex flex-col gap-5"
          >
            {sectionOrder.map((id) => {
              const content = renderSection(id)
              if (!content) return null
              const idx = sectionOrder.indexOf(id)
              const nextId =
                idx >= 0 && idx < sectionOrder.length - 1 ? (sectionOrder[idx + 1] as SectionId) : null
              const builtInRq = nextId ? isRevenueQuickPair(id, nextId, visible) : false
              const builtInEng = nextId ? isEngageAdjacentPair(id, nextId, visible) : false
              const anchored = splitAnchors.has(id)
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  dragListener
                  className="relative"
                  whileDrag={{ scale: 1.01, zIndex: 20, boxShadow: '0 20px 50px -20px rgba(0,0,0,0.5)' }}
                >
                  <div className="flex w-full min-w-0 gap-2.5">
                    <div
                      className="mt-1 flex h-9 w-9 flex-shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 active:cursor-grabbing dark:text-amber-300"
                      aria-label="Drag to reorder section"
                    >
                      <GripVertical className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 w-full flex-1 overflow-hidden">
                      {content}
                      {nextId ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/25 pt-2 text-[11px] leading-snug text-muted-foreground">
                          {builtInRq ? (
                            <span className="flex items-center gap-1.5">
                              <Columns2 className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                              Revenue and Platforms pair automatically when adjacent.
                            </span>
                          ) : builtInEng ? (
                            <span className="flex items-center gap-1.5">
                              <Columns2 className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                              Conversations and Alerts pair automatically when adjacent.
                            </span>
                          ) : (
                            <Label
                              htmlFor={`split-anchor-${id}`}
                              className="flex cursor-pointer items-center gap-2 font-normal"
                            >
                              <Checkbox
                                id={`split-anchor-${id}`}
                                checked={anchored}
                                onCheckedChange={(v) => {
                                  const checked = v === true
                                  setSplitAnchorsList((prev) => {
                                    const next = checked
                                      ? prev.includes(id)
                                        ? prev
                                        : [...prev, id]
                                      : prev.filter((x) => x !== id)
                                    const cleaned = reconcileSplitAnchors(sectionOrder, next)
                                    persistSplitAnchors(cleaned)
                                    return cleaned
                                  })
                                }}
                              />
                              <Columns2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span>Pair with next block (side by side on medium+)</span>
                            </Label>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        ) : (
          <motion.div className="flex flex-col gap-5" variants={listVariants} initial="hidden" animate="show">
            {orderToSegments(sectionOrder, visible, splitAnchors).map((seg, i) => {
              if (seg.type === 'rqPair') {
                const content = renderRqPair(seg.first)
                if (!content) return null
                return (
                  <motion.div key={`rq-${i}-${seg.first}`} variants={itemVariants}>
                    {content}
                  </motion.div>
                )
              }
              if (seg.type === 'engagePair') {
                const content = renderEngagePair(seg.left, seg.right)
                if (!content) return null
                return (
                  <motion.div key={`engage-${seg.left}-${seg.right}`} variants={itemVariants}>
                    {content}
                  </motion.div>
                )
              }
              if (seg.type === 'customPair') {
                const content = renderCustomPair(seg.left, seg.right)
                if (!content) return null
                return (
                  <motion.div key={`custom-${seg.left}-${seg.right}`} variants={itemVariants}>
                    {content}
                  </motion.div>
                )
              }
              const content = renderSection(seg.id)
              if (!content) return null
              return (
                <motion.div key={seg.id} variants={itemVariants}>
                  {content}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
