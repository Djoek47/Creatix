'use client'

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ConversationList, conversationRowKey, type Conversation } from './conversation-list'
import { ConversationRail } from './conversation-rail'
import { useIsMobile } from '@/hooks/use-mobile'
import { ChatWindow } from './chat-window'
import { MessagingLayout } from './MessagingLayout'
import { MassMessageDialog, MassMessageLaunchControl } from './mass-message-dialog'
import { MessageEngagementInsights } from './message-engagement-insights'
import { RightDrawer, type RightDrawerFanContext } from './RightDrawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'
import { InboxFiltersBar } from '@/components/messages/inbox-filters-bar'
import { cn } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import { dispatchMessagesNavUnreadTotal } from '@/lib/messages/messages-nav-unread-events'
import { uiFadeTransition, uiPanelTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RefreshCw,
  Loader2,
  ArrowLeft,
  BarChart3,
  MessageSquare,
  PanelLeft,
  User,
  Search,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Filter,
  Inbox,
  Link2,
  MoreHorizontal,
  Megaphone,
  AlertTriangle,
} from 'lucide-react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useMessagesFocusChrome } from '@/components/messages/messages-focus-chrome-context'
import type {
  InboxSegment,
  InboxSort,
  InboxPlatformFilter,
} from '@/lib/messages/inbox-crm'
import { FANSLY_LOGO_SRC, ONLYFANS_LOGO_SRC } from '@/lib/platform-logos'

type MessagesView = 'conversations' | 'insights'
type InboxMeta = {
  degraded?: boolean
  partial?: boolean
  provider_errors?: Partial<Record<'onlyfans' | 'fansly', string>>
  errors?: string[]
}

const INBOX_LIMIT = 40
const MESSAGE_WORKSPACE_PREFS_KEY = 'messages-workspace-layout-prefs-v1'

type WorkspaceTag = {
  id: string
  label: string
  value: number
  enabled?: boolean
}

type WorkspaceStatsPayload = {
  kpis: {
    totalConversations: number
    responseRate: number
    avgResponseTimeSeconds: number | null
    avgResponseTimeLabel: string
    messagesToday: number
  }
  customTags: WorkspaceTag[]
  fanContext: {
    fanId: string
    platform: string
    username: string | null
    displayName: string | null
    avatarUrl: string | null
    totalSpent: number
    memberSince: string | null
    lastActive: string | null
    totalMessages: number | null
    responseRate: number | null
    avgResponseTimeLabel: string | null
    recentOrders: Array<{ id: string; title: string; amount: number }>
  } | null
}

function pickNewerIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a && !b) return null
  if (!a) return b ?? null
  if (!b) return a
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  if (Number.isNaN(ta)) return b
  if (Number.isNaN(tb)) return a
  return ta >= tb ? a : b
}

function mergeDrawerFanContext(
  conv: Conversation,
  api: WorkspaceStatsPayload['fanContext'] | null,
): RightDrawerFanContext {
  const idMatch =
    api != null &&
    String(api.fanId) === String(conv.user.id) &&
    String(api.platform) === conv.platform
  const crm = conv.crm
  const threadTouch = conv.lastMessage?.createdAt ?? null

  if (!idMatch) {
    return {
      memberSince: crm?.subscriptionStart ?? null,
      lastActive: threadTouch,
      totalMessages: null,
      totalSpent: crm?.totalSpent ?? null,
      responseRate: null,
      avgResponseTimeLabel: null,
      recentOrders: [],
    }
  }

  const mergedSpend = Math.max(Number(api.totalSpent) || 0, Number(crm?.totalSpent) || 0)

  return {
    memberSince: api.memberSince ?? crm?.subscriptionStart ?? null,
    lastActive: pickNewerIso(api.lastActive, threadTouch),
    totalMessages: api.totalMessages,
    totalSpent: mergedSpend,
    responseRate: api.responseRate,
    avgResponseTimeLabel: api.avgResponseTimeLabel,
    recentOrders: api.recentOrders ?? [],
  }
}

const mobileSegBtnBase =
  'h-8 gap-1.5 rounded-md px-3 text-xs font-medium transition-[background-color,color] duration-150 ease-out'

const mobileSegBtnClass = (active: boolean) =>
  cn(
    mobileSegBtnBase,
    active
      ? 'bg-background/95 text-foreground shadow-sm dark:bg-slate-950/75'
      : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
  )

interface MessagesLayoutProps {
  userId: string
  /** From server: `?fanId=` (voice/Divine) or `?chat=` (dashboard links) on first paint. */
  initialFanId?: string
  /** From server: `?platform=onlyfans|fansly` when using `chat=`. */
  initialPlatform?: string
  /** True when OnlyFans or Fansly is connected (Integrations). Empty inbox is not always “not connected”. */
  hasFanPlatformConnected?: boolean
  /** Used to tune degraded-inbox notices (optional; both set from messages page). */
  hasOnlyFansConnected?: boolean
  hasFanslyConnected?: boolean
}

function pickConversationForDeepLink(
  list: Conversation[],
  fanId: string,
  platform?: string | null,
): Conversation | undefined {
  const id = String(fanId)
  const sameId = list.filter((c) => String(c.user.id) === id)
  if (sameId.length === 0) return undefined
  if (platform === 'onlyfans' || platform === 'fansly') {
    return sameId.find((c) => c.platform === platform) ?? sameId[0]
  }
  return sameId[0]
}

function WorkspaceKpiPanel({
  workspaceStats,
  workspaceStatsLoading,
  workspaceTagVisibility,
  setWorkspaceTagVisibility,
}: {
  workspaceStats: WorkspaceStatsPayload | null
  workspaceStatsLoading: boolean
  workspaceTagVisibility: Record<string, boolean>
  setWorkspaceTagVisibility: Dispatch<SetStateAction<Record<string, boolean>>>
}) {
  const t = useTranslations('messages.layout')
  const metrics = [
    { label: t('kpiConversations'), value: workspaceStats?.kpis.totalConversations?.toLocaleString() ?? '—' },
    {
      label: t('kpiResponseRate'),
      value: workspaceStats?.kpis.responseRate != null ? `${workspaceStats.kpis.responseRate}%` : '—',
    },
    { label: t('kpiAvgResponse'), value: workspaceStats?.kpis.avgResponseTimeLabel ?? '—' },
    { label: t('messagesToday'), value: workspaceStats?.kpis.messagesToday?.toLocaleString() ?? '—' },
  ] as const

  return (
    <div
      className={cn(
        'rounded-xl border border-white/40 bg-white/55 px-3 py-2 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl backdrop-saturate-150',
        'dark:border-white/[0.08] dark:bg-slate-950/45 dark:shadow-[0_16px_48px_-28px_rgba(0,0,0,0.45)]',
      )}
    >
      <div className="flex flex-col gap-2 min-[680px]:flex-row min-[680px]:items-center min-[680px]:gap-4">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 sm:gap-x-0 sm:divide-x sm:divide-border/25 dark:sm:divide-white/[0.08]">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0 sm:px-3 sm:first:pl-0 sm:last:pr-0">
              <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/78">
                {m.label}
              </p>
              <p className="mt-0.5 text-[0.8125rem] font-semibold tabular-nums tracking-[-0.02em] text-foreground/95 sm:text-[0.875rem]">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 min-[680px]:max-w-[48%] min-[680px]:justify-end min-[680px]:shrink-0">
          {(workspaceStats?.customTags ?? []).map((tag) => {
            const visible = workspaceTagVisibility[tag.id] !== false
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={visible}
                aria-label={`${tag.label} (${tag.value}). ${visible ? t('kpiTagHide') : t('kpiTagShow')}`}
                className={cn(
                  'inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none tracking-tight',
                  'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-black/[0.04] transition-[transform,box-shadow,background-color,border-color,opacity,color] duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:ring-white/[0.06] dark:focus-visible:ring-venus/35 dark:focus-visible:ring-offset-slate-950',
                  'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
                  visible
                    ? 'border-white/35 bg-gradient-to-r from-background/75 via-background/55 to-muted/25 text-muted-foreground hover:border-white/45 hover:from-background/90 hover:via-background/70 hover:to-muted/35 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.18)] dark:border-white/[0.12] dark:from-white/[0.08] dark:via-white/[0.05] dark:to-slate-900/40 dark:hover:border-white/[0.16] dark:hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]'
                    : 'border-dashed border-border/50 bg-background/15 text-muted-foreground/55 opacity-90 hover:border-border/65 hover:bg-background/28 hover:text-muted-foreground/75 hover:opacity-100 dark:border-white/[0.1] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]',
                )}
                onClick={() => setWorkspaceTagVisibility((prev) => ({ ...prev, [tag.id]: !visible }))}
                title={visible ? t('kpiTagHide') : t('kpiTagShow')}
              >
                <span
                  className={cn(
                    'min-w-0 truncate font-semibold',
                    visible ? 'text-foreground/92' : 'text-foreground/55',
                  )}
                >
                  {tag.label}
                </span>
                <span
                  className={cn(
                    'shrink-0 tabular-nums leading-none',
                    visible ? 'text-muted-foreground/90' : 'text-muted-foreground/50',
                  )}
                >
                  {tag.value}
                </span>
              </button>
            )
          })}
          {workspaceStatsLoading ? (
            <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground/85">
              <Loader2 className="h-3 w-3 animate-spin opacity-80" aria-hidden />
              {t('kpiUpdating')}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const inboxToolbarRowClass =
  'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-snug tracking-[-0.01em] sm:text-[13px]'

function ThreadCountChip({ count }: { count: number }) {
  const t = useTranslations('messages.layout')
  const label = t('threadCount', { count })
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground/90',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:bg-white/[0.06]',
      )}
    >
      {label}
    </span>
  )
}

function ToolbarSep() {
  return (
    <span className="inline-flex shrink-0 select-none text-muted-foreground/40" aria-hidden>
      ·
    </span>
  )
}

function PlatformConnectChips() {
  const t = useTranslations('messages.layout')
  const chip =
    'inline-flex items-center gap-1 rounded-md border border-border/35 bg-background/40 px-1.5 py-0.5 ring-1 ring-primary/[0.08] dark:bg-white/[0.04]'
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className="font-medium text-muted-foreground/90">{t('connectChip')}</span>
      <span className={chip}>
        <Image
          src={ONLYFANS_LOGO_SRC}
          alt=""
          width={13}
          height={13}
          className="rounded-[3px]"
        />
        <span className="text-[11px] font-medium text-foreground/88">{t('platformOnlyfans')}</span>
      </span>
      <span className="text-[11px] text-muted-foreground/55">{t('connectOr')}</span>
      <span className={chip}>
        <Image src={FANSLY_LOGO_SRC} alt="" width={13} height={13} className="rounded-[3px]" />
        <span className="text-[11px] font-medium text-foreground/88">{t('platformFansly')}</span>
      </span>
    </span>
  )
}

function MessagesInboxToolbarSubtitle({
  view,
  conversationsLength,
  hasFanPlatformConnected,
  inboxNarrowingActive,
}: {
  view: MessagesView
  conversationsLength: number
  hasFanPlatformConnected: boolean
  inboxNarrowingActive: boolean
}): ReactNode {
  const t = useTranslations('messages.layout')
  if (view === 'insights') {
    return (
      <div className={inboxToolbarRowClass}>
        <BarChart3 className="h-3.5 w-3.5 shrink-0 text-violet-400/90" aria-hidden />
        <span className="font-semibold text-foreground/90">{t('insightsTitle')}</span>
        <ToolbarSep />
        <span className="text-muted-foreground/88">{t('insightsSubtitle')}</span>
      </div>
    )
  }

  const n = conversationsLength

  if (n === 0 && !hasFanPlatformConnected) {
    return (
      <div className={inboxToolbarRowClass}>
        <ThreadCountChip count={n} />
        <ToolbarSep />
        <PlatformConnectChips />
      </div>
    )
  }

  if (n === 0 && inboxNarrowingActive) {
    return (
      <div className={inboxToolbarRowClass}>
        <ThreadCountChip count={n} />
        <ToolbarSep />
        <Filter className="h-3.5 w-3.5 shrink-0 text-amber-400/85" aria-hidden />
        <span className="text-muted-foreground/88">{t('noneMatchFilter')}</span>
      </div>
    )
  }

  if (n === 0) {
    return (
      <div className={inboxToolbarRowClass}>
        <ThreadCountChip count={n} />
        <ToolbarSep />
        <Inbox className="h-3.5 w-3.5 shrink-0 text-muted-foreground/65" aria-hidden />
        <span className="text-muted-foreground/88">{t('inboxEmpty')}</span>
      </div>
    )
  }

  if (inboxNarrowingActive) {
    return (
      <div className={inboxToolbarRowClass}>
        <ThreadCountChip count={n} />
        <ToolbarSep />
        <Filter className="h-3.5 w-3.5 shrink-0 text-amber-400/85" aria-hidden />
        <span className="font-medium text-foreground/85">{t('filteredLabel')}</span>
      </div>
    )
  }

  return (
    <div className={inboxToolbarRowClass}>
      <ThreadCountChip count={n} />
      <ToolbarSep />
      <Link2 className="h-3.5 w-3.5 shrink-0 text-primary/75" aria-hidden />
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground/88">
        <span className="font-medium text-foreground/80">{t('crmSegments')}</span>
        <ToolbarSep />
        <span className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-background/35 px-1.5 py-0.5 dark:bg-white/[0.04]">
          <Image
            src={ONLYFANS_LOGO_SRC}
            alt=""
            width={12}
            height={12}
            className="rounded-[2px]"
          />
          <span className="text-[11px] font-medium text-foreground/85">{t('platformOnlyfans')}</span>
        </span>
        <span className="text-muted-foreground/50">{t('platformAmpersand')}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-background/35 px-1.5 py-0.5 dark:bg-white/[0.04]">
          <Image src={FANSLY_LOGO_SRC} alt="" width={12} height={12} className="rounded-[2px]" />
          <span className="text-[11px] font-medium text-foreground/85">{t('platformFansly')}</span>
        </span>
      </span>
    </div>
  )
}

function MessagesLayoutContent({
  userId,
  initialFanId,
  initialPlatform,
  hasFanPlatformConnected = false,
  hasOnlyFansConnected,
  hasFanslyConnected,
}: MessagesLayoutProps) {
  const tLayout = useTranslations('messages.layout')
  const tInbox = useTranslations('messages.inbox')
  const { reduced } = useUiMotionPreferences()
  const fadeTransition = uiFadeTransition(reduced)
  const panelTransition = uiPanelTransition(reduced)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const divinePanel = useDivinePanel()
  const fanIdFromUrl =
    searchParams.get('fanId') ?? searchParams.get('chat') ?? initialFanId ?? undefined
  const platformFromUrl =
    searchParams.get('platform') ?? initialPlatform ?? undefined
  const chatterDraftOutboxId = searchParams.get('chatterDraft') ?? undefined
  // Prefer explicit voice focus first; fallback to URL deep-link.
  const preferredFanIdRef = useRef<string | undefined>(undefined)
  preferredFanIdRef.current = divinePanel?.focusedFan?.id ?? fanIdFromUrl
  const preferredPlatformRef = useRef<string | undefined>(undefined)
  preferredPlatformRef.current = divinePanel?.focusedFan?.id ? undefined : platformFromUrl
  const [view, setView] = useState<MessagesView>('conversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false)
  const selectedRef = useRef<Conversation | null>(null)
  selectedRef.current = selectedConversation
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inboxMeta, setInboxMeta] = useState<InboxMeta | null>(null)
  const [fanProfileOpen, setFanProfileOpen] = useState(false)
  /** Desktop: false = avatar-only rail; true = expanded with names + last message. */
  const [chatsRailExpanded, setChatsRailExpanded] = useState(false)
  const { focusMode, setFocusMode, workspaceBarCollapsed, setWorkspaceBarCollapsed } =
    useMessagesFocusChrome()
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true)
  const [kpiStripVisible, setKpiStripVisible] = useState(true)
  /** Mobile: workspace KPIs open in a sheet (never the bottom strip). */
  const [kpiStatsSheetOpen, setKpiStatsSheetOpen] = useState(false)
  /** Mass Message dialog (single instance; mobile row + desktop toolbar open via this state). */
  const [massDialogOpen, setMassDialogOpen] = useState(false)
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStatsPayload | null>(null)
  const [workspaceStatsLoading, setWorkspaceStatsLoading] = useState(false)
  const [workspaceTagVisibility, setWorkspaceTagVisibility] = useState<Record<string, boolean>>({})
  const drawerFanContext = useMemo((): RightDrawerFanContext | undefined => {
    if (!selectedConversation) return undefined
    return mergeDrawerFanContext(selectedConversation, workspaceStats?.fanContext ?? null)
  }, [selectedConversation, workspaceStats?.fanContext])
  const inboxSearchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MESSAGE_WORKSPACE_PREFS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        rightDrawerOpen?: boolean
        chatsRailExpanded?: boolean
        kpiStripVisible?: boolean
      }
      if (typeof parsed.rightDrawerOpen === 'boolean') setRightDrawerOpen(parsed.rightDrawerOpen)
      if (typeof parsed.chatsRailExpanded === 'boolean') setChatsRailExpanded(parsed.chatsRailExpanded)
      if (typeof parsed.kpiStripVisible === 'boolean') setKpiStripVisible(parsed.kpiStripVisible)
    } catch {
      // ignore local preference read issues
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MESSAGE_WORKSPACE_PREFS_KEY,
        JSON.stringify({ rightDrawerOpen, chatsRailExpanded, kpiStripVisible }),
      )
    } catch {
      // ignore local preference write issues
    }
  }, [rightDrawerOpen, chatsRailExpanded, kpiStripVisible])

  useEffect(() => {
    if (view !== 'conversations') setMassDialogOpen(false)
  }, [view])

  const [segment, setSegment] = useState<InboxSegment>('all')
  const [sort, setSort] = useState<InboxSort>('recent')
  const [inboxPlatform, setInboxPlatform] = useState<InboxPlatformFilter>('all')
  const [tag, setTag] = useState('')
  const [inboxSearch, setInboxSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [hasMoreInbox, setHasMoreInbox] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const listOffsetRef = useRef(0)

  const platformDegradeFlagsKnown =
    typeof hasOnlyFansConnected === 'boolean' && typeof hasFanslyConnected === 'boolean'
  const onlyFansConnectedFlag = Boolean(hasOnlyFansConnected)
  const fanslyConnectedFlag = Boolean(hasFanslyConnected)

  const showDegradedInboxBanner = useMemo(() => {
    if (view !== 'conversations' || !inboxMeta?.degraded) return false
    const fs = platformDegradeFlagsKnown ? fanslyConnectedFlag : true
    const of = platformDegradeFlagsKnown ? onlyFansConnectedFlag : false
    const ofOnlyEmpty = platformDegradeFlagsKnown && of && !fs && conversations.length === 0
    if (inboxMeta.partial && !fs) return false
    if (ofOnlyEmpty) return false
    return true
  }, [
    view,
    inboxMeta?.degraded,
    inboxMeta?.partial,
    platformDegradeFlagsKnown,
    onlyFansConnectedFlag,
    fanslyConnectedFlag,
    conversations.length,
  ])

  const inboxSegmentLabel = useCallback(
    (seg: InboxSegment) => {
      switch (seg) {
        case 'all':
          return tInbox('segmentAll')
        case 'unread':
          return tInbox('segmentUnread')
        case 'whales':
          return tInbox('segmentWhales')
        case 'creators':
          return tInbox('segmentCreators')
        case 'fans':
          return tInbox('segmentFans')
        default:
          return tInbox('segmentAll')
      }
    },
    [tInbox],
  )

  const conversationMobileSubtitleForConv = useCallback(
    (c: Conversation) => {
      const platform =
        c.platform === 'onlyfans' ? tLayout('mobilePlatformOfAbbrev') : tLayout('mobilePlatformFansly')
      const badge = c.crm?.audienceBadges?.[0]?.label
      const tier = c.crm?.tier?.trim()
      const segmentLabel = badge || tier || tLayout('mobileSegmentFallback')
      return `${platform} · ${segmentLabel}`
    },
    [tLayout],
  )

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => setSearchDebounced(inboxSearch.trim()), 320)
    return () => window.clearTimeout(debounceTimer)
  }, [inboxSearch])

  useEffect(() => {
    const total = conversations.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0)
    dispatchMessagesNavUnreadTotal(total)
  }, [conversations])

  const dispatchCollapseDashboardSidebar = useCallback(() => {
    if (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) {
      window.dispatchEvent(new CustomEvent('messages:open-chats-menu'))
    }
  }, [pathname])

  /** Mobile / desktop focus: inbox sheet. Desktop normal: toggle chat rail width. */
  const openChatsMenu = useCallback(() => {
    if (isMobile || focusMode) {
      setConversationMenuOpen(true)
      dispatchCollapseDashboardSidebar()
    } else {
      setChatsRailExpanded((prev) => {
        const next = !prev
        if (next) dispatchCollapseDashboardSidebar()
        return next
      })
    }
  }, [isMobile, focusMode, dispatchCollapseDashboardSidebar])

  useEffect(() => {
    setFanProfileOpen(false)
  }, [selectedConversation?.user.id, selectedConversation?.platform])

  useEffect(() => {
    setRightDrawerOpen(false)
  }, [selectedConversation?.user.id, selectedConversation?.platform])

  useEffect(() => {
    if (focusMode) return
    const onResize = () => {
      if (window.innerWidth < 1280) setRightDrawerOpen(false)
      if (window.innerWidth < 1024) setChatsRailExpanded(false)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [focusMode])

  useEffect(() => {
    if (!focusMode) return
    setChatsRailExpanded(false)
    setRightDrawerOpen(false)
    setConversationMenuOpen(false)
  }, [focusMode])

  useEffect(() => {
    if (!focusMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (conversationMenuOpen) {
        setConversationMenuOpen(false)
        e.preventDefault()
        return
      }
      setFocusMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode, setFocusMode, conversationMenuOpen])

  useEffect(() => {
    const onSidebarExpanded = () => {
      setConversationMenuOpen(false)
      setChatsRailExpanded(false)
    }
    window.addEventListener('dashboard:left-sidebar-expanded', onSidebarExpanded as EventListener)
    return () => {
      window.removeEventListener('dashboard:left-sidebar-expanded', onSidebarExpanded as EventListener)
    }
  }, [])

  const loadInbox = useCallback(
    async (opts?: { refresh?: boolean; append?: boolean }) => {
      const append = opts?.append ?? false
      const refresh = opts?.refresh ?? false
      if (append) setLoadingMore(true)
      else if (refresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      if (!append) {
        listOffsetRef.current = 0
      }
      const offset = append ? listOffsetRef.current : 0

      try {
        const params = new URLSearchParams({
          limit: String(INBOX_LIMIT),
          offset: String(offset),
          segment,
          sort,
          platform: inboxPlatform,
          search: searchDebounced,
          tag: tag.trim(),
        })
        if (refresh) params.set('refresh', 'true')
        const res = await fetch(`/api/messages/inbox?${params}`, { credentials: 'include' })
        const data = (await res.json()) as {
          conversations?: Conversation[]
          error?: string
          code?: string
          message?: string
          hasMore?: boolean
          nextOffset?: number
          meta?: InboxMeta
        }

        if (!res.ok) {
          const msg =
            data.message ||
            data.error ||
            tLayout('errorLoadInboxStatus', { status: String(res.status) })
          if (data.code === 'ONLYFANS_SESSION_EXPIRED') {
            setError(tLayout('errorSessionExpired'))
          } else if (
            res.status === 429 ||
            data.code === 'ONLYFANS_RATE_LIMIT' ||
            res.status === 503 ||
            data.code === 'ONLYFANS_UPSTREAM'
          ) {
            setError(tLayout('errorRateLimitUpstream'))
          } else {
            setError(msg)
          }
          setInboxMeta(null)
          return
        }

        const rows = data.conversations ?? []
        setInboxMeta(data.meta ?? null)
        listOffsetRef.current =
          typeof data.nextOffset === 'number' ? data.nextOffset : offset + rows.length
        setHasMoreInbox(Boolean(data.hasMore))

        if (append) {
          setConversations((prev) => [...prev, ...rows])
        } else {
          setConversations(rows)
          setSelectedConversation((prev) => {
            if (rows.length === 0) return null
            const preferredFanId = preferredFanIdRef.current
            if (preferredFanId) {
              const preferred = pickConversationForDeepLink(
                rows,
                preferredFanId,
                preferredPlatformRef.current,
              )
              if (preferred) return preferred
            }
            if (!prev) return rows[0]
            const stillThere = rows.find(
              (c) =>
                String(c.user.id) === String(prev.user.id) && c.platform === prev.platform,
            )
            return stillThere ?? rows[0]
          })
        }

        const recentsPayload = append ? rows : rows
        if (recentsPayload.length > 0) {
          void fetch('/api/divine/fan-recents', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rows: recentsPayload.map((c) => ({
                fanId: String(c.user.id),
                username: c.user.username,
                displayName: c.user.name,
                platform: c.platform,
              })),
            }),
          }).catch(() => undefined)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : tLayout('errorLoadConversations'))
        setInboxMeta(null)
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    },
    [segment, sort, inboxPlatform, tag, searchDebounced, tLayout],
  )

  const loadInboxRef = useRef(loadInbox)
  loadInboxRef.current = loadInbox

  useEffect(() => {
    void loadInbox()
  }, [segment, sort, inboxPlatform, tag, searchDebounced, loadInbox])

  const loadMoreInbox = useCallback(() => {
    if (loadingMore || !hasMoreInbox) return
    void loadInbox({ append: true })
  }, [loadInbox, loadingMore, hasMoreInbox])

  const loadWorkspaceStats = useCallback(async () => {
    setWorkspaceStatsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedConversation?.user?.id) {
        params.set('fanId', String(selectedConversation.user.id))
        params.set('platform', selectedConversation.platform)
      }
      const query = params.toString()
      const res = await fetch(`/api/messages/workspace-stats${query ? `?${query}` : ''}`, {
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({}))) as WorkspaceStatsPayload & { error?: string }
      if (!res.ok || data.error) return
      setWorkspaceStats(data)
      setWorkspaceTagVisibility((prev) => {
        const next = { ...prev }
        for (const tag of data.customTags ?? []) {
          if (next[tag.id] === undefined) next[tag.id] = tag.enabled !== false
        }
        return next
      })
    } finally {
      setWorkspaceStatsLoading(false)
    }
  }, [selectedConversation?.user?.id, selectedConversation?.platform])

  useEffect(() => {
    void loadWorkspaceStats()
  }, [loadWorkspaceStats, conversations.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '[' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        setChatsRailExpanded(false)
        return
      }
      if (event.key === ']' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        if (!isMobile) setRightDrawerOpen((v) => !v)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (view !== 'conversations') setView('conversations')
        if (isMobile) {
          setConversationMenuOpen(true)
          window.setTimeout(() => mobileSearchInputRef.current?.focus(), 50)
          return
        }
        if (!focusMode) {
          setChatsRailExpanded(true)
          window.setTimeout(() => inboxSearchInputRef.current?.focus(), 50)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusMode, isMobile, view])

  // Open the thread for ?fanId= / ?chat= or Divine voice/chat "focus fan"
  useEffect(() => {
    if (!fanIdFromUrl || conversations.length === 0) return
    const match = pickConversationForDeepLink(conversations, fanIdFromUrl, platformFromUrl)
    if (!match) return
    const cur = selectedRef.current
    if (
      cur &&
      String(cur.user.id) === String(match.user.id) &&
      cur.platform === match.platform
    ) {
      return
    }
    setSelectedConversation(match)
  }, [fanIdFromUrl, platformFromUrl, conversations])

  useEffect(() => {
    const id = divinePanel?.focusedFan?.id
    if (!id || conversations.length === 0) return
    if (selectedRef.current && String(selectedRef.current.user.id) === String(id)) return
    const match = conversations.find((c) => String(c.user.id) === String(id))
    if (!match) return
    setSelectedConversation(match)
  }, [divinePanel?.focusedFan?.id, conversations])

  const threadInsightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const conv = selectedConversation
    let id: string | null = null
    let platform: 'onlyfans' | 'fansly' = 'onlyfans'
    if (conv?.platform === 'onlyfans') {
      id = String(conv.user.id)
      platform = 'onlyfans'
    } else if (conv?.platform === 'fansly') {
      id = String(conv.user.id)
      platform = 'fansly'
    } else if (!conv && fanIdFromUrl) {
      // Deep link (?fanId=) while conversations still loading — same debounced refresh as overlay/Divine focus
      id = String(fanIdFromUrl)
    }
    if (!id) return
    if (threadInsightDebounceRef.current) clearTimeout(threadInsightDebounceRef.current)
    // Short client debounce batches rapid conversation switches; server still debounces duplicate OF fetches (~90s).
    threadInsightDebounceRef.current = setTimeout(() => {
      void fetch('/api/divine/refresh-thread-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fanId: id, platform }),
      }).catch(() => undefined)
    }, 1_200)
    return () => {
      if (threadInsightDebounceRef.current) clearTimeout(threadInsightDebounceRef.current)
    }
    // Omit full `selectedConversation` — new object refs from refresh would retrigger unnecessarily.
  }, [selectedConversation?.user.id, selectedConversation?.platform, fanIdFromUrl])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">{tLayout('loadingMessages')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-4">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">{tLayout('failedLoadTitle')}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void loadInbox()} className="mt-4">
            {tLayout('tryAgain')}
          </Button>
        </div>
      </div>
    )
  }

  const inboxNarrowingActive =
    segment !== 'all' ||
    inboxPlatform !== 'all' ||
    Boolean(tag.trim()) ||
    Boolean(searchDebounced)

  const emptyInboxChatTitle =
    conversations.length === 0
      ? !hasFanPlatformConnected
        ? tLayout('emptyConnectPlatformTitle')
        : inboxNarrowingActive
          ? tLayout('emptyNoThreadsTitle')
          : tLayout('emptyNoMessagesTitle')
      : undefined

  const emptyInboxChatDescription =
    conversations.length === 0
      ? !hasFanPlatformConnected
        ? tLayout('emptyConnectPlatformDesc')
        : inboxNarrowingActive
          ? segment === 'whales'
            ? tLayout('emptyWhalesHint')
            : segment !== 'all'
              ? tLayout('emptySegmentHint', { segment: inboxSegmentLabel(segment) })
              : tLayout('emptyFiltersHint')
          : tLayout('emptyInboxDefault')
      : undefined

  const hideMessagesToolbar = focusMode && !isMobile
  const showMobileFocusStrip = focusMode && isMobile

  /** Mobile: message-first chrome (not scaled-down desktop icons). */
  const showMobileMessagesChrome = isMobile && !focusMode
  /** Desktop: KPI strip mounts here so collapse can animate; visibility is `kpiStripVisible`. */
  const showDesktopKpiStripSlot = !focusMode && !isMobile

  const toolbarIconBtn =
    'border border-border/25 bg-background/25 text-muted-foreground shadow-none backdrop-blur-sm transition-[background-color,border-color,color] duration-150 ease-out hover:bg-muted/35 hover:text-foreground dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]'

  const mobileOverflowConversationsItems = (
    <>
      <DropdownMenuItem
        onClick={() => {
          void loadInbox({ refresh: true })
        }}
        disabled={refreshing}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh inbox
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setFocusMode((v) => !v)}>
        {focusMode ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
        {focusMode ? 'Exit focus mode' : 'Focus mode'}
      </DropdownMenuItem>
      {!focusMode ? (
        <DropdownMenuItem onClick={() => setWorkspaceBarCollapsed((v) => !v)}>
          {workspaceBarCollapsed ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronUp className="mr-2 h-4 w-4" />}
          {workspaceBarCollapsed ? 'Show workspace bar' : 'Hide workspace bar'}
        </DropdownMenuItem>
      ) : null}
      {!focusMode ? (
        <DropdownMenuItem
          onClick={() => {
            setKpiStatsSheetOpen(true)
          }}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Workspace stats
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={() => openChatsMenu()}>
        <PanelLeft className="mr-2 h-4 w-4" />
        {selectedConversation ? 'Conversation list' : 'Open inbox'}
      </DropdownMenuItem>
      {selectedConversation ? (
        <DropdownMenuItem onClick={() => setFanProfileOpen(true)}>
          <User className="mr-2 h-4 w-4" />
          Fan profile
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard/messages/mass" className="flex items-center">
          <Megaphone className="mr-2 h-4 w-4" />
          Mass page (Pro)
        </Link>
      </DropdownMenuItem>
    </>
  )

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col px-0 sm:px-0.5">
      <MassMessageDialog open={massDialogOpen} onOpenChange={setMassDialogOpen} showTrigger={false} />
      {showMobileFocusStrip && view === 'conversations' ? (
        <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-2 sm:mb-3">
          <div className="flex items-center gap-2">
            {selectedConversation ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                onClick={openChatsMenu}
                aria-label={tLayout('mobileBackConversationsAria')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={openChatsMenu}>
              <PanelLeft className="h-3.5 w-3.5" />
              {tLayout('mobileChats')}
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={() => setFocusMode(false)}
          >
            <Minimize2 className="h-4 w-4" />
            {tLayout('mobileExitFocus')}
          </Button>
        </div>
      ) : null}

      {!hideMessagesToolbar && showMobileMessagesChrome ? (
        <div className="mb-2 flex flex-shrink-0 flex-col gap-2 sm:mb-3">
          {view === 'conversations' ? (
            <>
              <div className="flex min-h-[2.75rem] items-center gap-2">
                {selectedConversation ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={openChatsMenu}
                      aria-label={tLayout('mobileBackConversationsAria')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-0.5 text-left transition-colors hover:bg-muted/25"
                      onClick={() => setFanProfileOpen(true)}
                    >
                      <Avatar className="h-10 w-10 shrink-0 border border-border/40">
                        <AvatarImage
                          src={proxyImageUrl(selectedConversation.user.avatar || undefined) || undefined}
                          alt=""
                        />
                        <AvatarFallback className="text-xs">
                          {(selectedConversation.user.name || selectedConversation.user.username || '?').slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
                          {selectedConversation.user.name || selectedConversation.user.username || 'Fan'}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {conversationMobileSubtitleForConv(selectedConversation)}
                        </p>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5" onClick={openChatsMenu}>
                      <PanelLeft className="h-3.5 w-3.5" />
                      Chats
                    </Button>
                    <div className="min-w-0 flex-1">
                      <MessagesInboxToolbarSubtitle
                        view={view}
                        conversationsLength={conversations.length}
                        hasFanPlatformConnected={hasFanPlatformConnected}
                        inboxNarrowingActive={inboxNarrowingActive}
                      />
                    </div>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      aria-label={tLayout('moreInboxActionsAria')}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {mobileOverflowConversationsItems}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 flex-1 rounded-lg bg-muted/30 p-0.5 ring-1 ring-border/15 dark:bg-white/[0.04] dark:ring-white/[0.07]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(mobileSegBtnClass(true), 'flex-1')}
                    onClick={() => setView('conversations')}
                  >
                    <MessageSquare className="h-3.5 w-3.5 opacity-80" />
                    Chats
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(mobileSegBtnClass(false), 'flex-1')}
                    onClick={() => setView('insights')}
                  >
                    <BarChart3 className="h-3.5 w-3.5 opacity-80" />
                    Insights
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 px-3"
                  onClick={() => setMassDialogOpen(true)}
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  Mass Message
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex min-h-[2.5rem] items-center gap-2">
                <div className="min-w-0 flex-1">
                  <MessagesInboxToolbarSubtitle
                    view={view}
                    conversationsLength={conversations.length}
                    hasFanPlatformConnected={hasFanPlatformConnected}
                    inboxNarrowingActive={inboxNarrowingActive}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" aria-label="More actions">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => void loadInbox({ refresh: true })} disabled={refreshing}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh inbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWorkspaceBarCollapsed((v) => !v)}>
                      {workspaceBarCollapsed ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronUp className="mr-2 h-4 w-4" />}
                      {workspaceBarCollapsed ? 'Show workspace bar' : 'Hide workspace bar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setKpiStatsSheetOpen(true)}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Workspace stats
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex rounded-lg bg-muted/30 p-0.5 ring-1 ring-border/15 dark:bg-white/[0.04] dark:ring-white/[0.07]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(mobileSegBtnClass(false), 'flex-1')}
                  onClick={() => setView('conversations')}
                >
                  <MessageSquare className="h-3.5 w-3.5 opacity-80" />
                  Chats
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(mobileSegBtnClass(true), 'flex-1')}
                  onClick={() => setView('insights')}
                >
                  <BarChart3 className="h-3.5 w-3.5 opacity-80" />
                  Insights
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!hideMessagesToolbar && !showMobileMessagesChrome ? (
        <div className="mb-2 flex min-h-[2.5rem] flex-shrink-0 flex-wrap items-center justify-between gap-3 sm:mb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <MessagesInboxToolbarSubtitle
                view={view}
                conversationsLength={conversations.length}
                hasFanPlatformConnected={hasFanPlatformConnected}
                inboxNarrowingActive={inboxNarrowingActive}
              />
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <div className="hidden rounded-lg bg-muted/30 p-0.5 ring-1 ring-border/15 dark:bg-white/[0.04] dark:ring-white/[0.07] sm:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 gap-1.5 rounded-md px-3 text-xs font-medium transition-[background-color,color] duration-150 ease-out',
                  view === 'conversations'
                    ? 'bg-background/95 text-foreground shadow-sm dark:bg-slate-950/75'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                )}
                onClick={() => setView('conversations')}
              >
                <MessageSquare className="h-3.5 w-3.5 opacity-80" />
                Chats
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 gap-1.5 rounded-md px-3 text-xs font-medium transition-[background-color,color] duration-150 ease-out',
                  view === 'insights'
                    ? 'bg-background/95 text-foreground shadow-sm dark:bg-slate-950/75'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                )}
                onClick={() => setView('insights')}
              >
                <BarChart3 className="h-3.5 w-3.5 opacity-80" />
                Insights
              </Button>
            </div>
            {view === 'conversations' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('hidden md:flex', toolbarIconBtn)}
                  onClick={openChatsMenu}
                  aria-label="Open conversations menu"
                  title="Open conversations menu"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={toolbarIconBtn}
                  onClick={() => void loadInbox({ refresh: true })}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={toolbarIconBtn}
                  onClick={() => setFocusMode((v) => !v)}
                  title={focusMode ? 'Exit focus mode' : 'Focus mode'}
                >
                  {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                {!focusMode ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(toolbarIconBtn, workspaceBarCollapsed && 'text-foreground')}
                    onClick={() => setWorkspaceBarCollapsed((v) => !v)}
                    title={
                      workspaceBarCollapsed
                        ? 'Show top workspace bar (search, account, tools)'
                        : 'Hide top workspace bar for more chat space'
                    }
                    aria-expanded={!workspaceBarCollapsed}
                    aria-controls="dashboard-workspace-header"
                  >
                    {workspaceBarCollapsed ? (
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    ) : (
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    )}
                    <span className="sr-only">
                      {workspaceBarCollapsed ? 'Show workspace bar' : 'Hide workspace bar'}
                    </span>
                  </Button>
                ) : null}
                {!isMobile && selectedConversation && !focusMode ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'hidden h-8 rounded-lg px-3 text-xs font-medium lg:inline-flex',
                      rightDrawerOpen
                        ? 'bg-muted/40 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                    )}
                    onClick={() => setRightDrawerOpen((v) => !v)}
                  >
                    Profile
                  </Button>
                ) : null}
                {!focusMode ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      toolbarIconBtn,
                      'relative overflow-hidden',
                      (isMobile ? kpiStatsSheetOpen : kpiStripVisible) &&
                        'border-border/40 bg-muted/30 text-foreground',
                    )}
                    onClick={() => {
                      if (isMobile) setKpiStatsSheetOpen(true)
                      else setKpiStripVisible((v) => !v)
                    }}
                    aria-expanded={isMobile ? kpiStatsSheetOpen : kpiStripVisible}
                    aria-controls={isMobile ? undefined : 'workspace-kpi-panel'}
                    title={
                      isMobile
                        ? 'Workspace stats'
                        : kpiStripVisible
                          ? 'Hide workspace stats strip'
                          : 'Show workspace stats strip'
                    }
                  >
                    <motion.span
                      className="inline-flex will-change-transform"
                      initial={false}
                      animate={{
                        rotate: isMobile ? 0 : kpiStripVisible ? 0 : -90,
                        scale: isMobile ? 1 : kpiStripVisible ? 1 : 0.9,
                      }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 420, damping: 28, mass: 0.75 }
                      }
                    >
                      <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    </motion.span>
                    <span className="sr-only">
                      {isMobile
                        ? 'Open workspace stats'
                        : kpiStripVisible
                          ? 'Hide workspace stats strip'
                          : 'Show workspace stats strip'}
                    </span>
                  </Button>
                ) : null}
                <MassMessageLaunchControl onOpen={() => setMassDialogOpen(true)} />
              </>
            )}
          </div>
        </div>
      ) : null}

      {showDegradedInboxBanner ? (
        <div
          title={
            inboxMeta?.partial
              ? tLayout('inboxDegradedPartialTitle')
              : tLayout('inboxDegradedGenericTitle')
          }
          className={cn(
            'mb-1.5 inline-flex max-w-full items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1',
            'text-[10px] font-medium leading-tight text-amber-950/88 backdrop-blur-sm',
            'dark:border-amber-400/16 dark:bg-amber-400/[0.07] dark:text-amber-50/88',
          )}
        >
          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 opacity-90 dark:text-amber-300" aria-hidden />
          <span className="min-w-0">
            {inboxMeta?.partial
              ? tLayout('inboxDegradedPartialShort')
              : tLayout('inboxDegradedGenericShort')}
          </span>
        </div>
      ) : null}

      {hideMessagesToolbar ? (
        <div
          className={cn(
            'pointer-events-none fixed inset-x-0 top-0 z-50 flex gap-2 px-3 pt-3 md:px-4 md:pt-4',
            'md:pl-[calc(4rem+0.75rem)]',
          )}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="pointer-events-auto h-9 gap-1.5 shadow-md"
            onClick={() => setConversationMenuOpen(true)}
            title="Open inbox"
          >
            <PanelLeft className="h-4 w-4" />
            Chats
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="pointer-events-auto ml-auto h-9 gap-1.5 shadow-md"
            onClick={() => setFocusMode(false)}
          >
            <Minimize2 className="h-4 w-4" />
            Exit focus
          </Button>
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {view === 'insights' ? (
          <motion.div
            key="insights-view"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={fadeTransition}
            className="flex-1 min-h-0 overflow-auto"
          >
            <MessageEngagementInsights />
          </motion.div>
        ) : (
          <motion.div
            key="conversations-view"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={fadeTransition}
            className={cn(
              'flex min-h-0 flex-1 flex-col',
              !focusMode && 'gap-3',
              hideMessagesToolbar && 'pt-12',
            )}
          >
            {selectedConversation ? (
              <FanProfileModal
                open={fanProfileOpen}
                onOpenChange={setFanProfileOpen}
                fanId={String(selectedConversation.user.id)}
                platform={selectedConversation.platform === 'onlyfans' ? 'onlyfans' : 'fansly'}
                initialUsername={selectedConversation.user.username}
                initialName={selectedConversation.user.name}
                initialAvatar={selectedConversation.user.avatar}
              />
            ) : null}
            <motion.div
              layout
              transition={panelTransition}
              className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <MessagingLayout
                focusMode={focusMode}
                leftRailExpanded={chatsRailExpanded}
                leftPane={
                  !isMobile && !focusMode ? (
                    <ConversationRail
                      conversations={conversations}
                      selectedKey={
                        selectedConversation ? conversationRowKey(selectedConversation) : undefined
                      }
                      onSelect={(conv) => setSelectedConversation(conv)}
                      expanded={chatsRailExpanded}
                      onExpandedChange={(expanded) => {
                        setChatsRailExpanded(expanded)
                      }}
                      segment={segment}
                      onSegmentChange={setSegment}
                      sort={sort}
                      onSortChange={setSort}
                      platform={inboxPlatform}
                      onPlatformChange={setInboxPlatform}
                      tag={tag}
                      onTagChange={setTag}
                      searchQuery={inboxSearch}
                      onSearchQueryChange={setInboxSearch}
                      hasMore={hasMoreInbox}
                      loadingMore={loadingMore}
                      onLoadMore={loadMoreInbox}
                      searchInputRef={inboxSearchInputRef}
                    />
                  ) : null
                }
                centerPane={
                  <ChatWindow
                    conversation={selectedConversation}
                    userId={userId}
                    chatterDraftOutboxId={chatterDraftOutboxId}
                    onMessageSent={() => void loadInboxRef.current({ refresh: true })}
                    onOpenFanProfile={() => setFanProfileOpen(true)}
                    nullConversationTitle={emptyInboxChatTitle}
                    nullConversationDescription={emptyInboxChatDescription}
                    showPlatformConnectActions={conversations.length === 0 && !hasFanPlatformConnected}
                    compactMobileChrome={
                      isMobile && !focusMode && Boolean(selectedConversation) && view === 'conversations'
                    }
                  />
                }
                rightPane={
                  !isMobile && rightDrawerOpen && selectedConversation ? (
                    <RightDrawer
                      conversation={selectedConversation}
                      onOpenFanProfile={() => setFanProfileOpen(true)}
                      fanContext={drawerFanContext}
                    />
                  ) : null
                }
              />
            </motion.div>
            {showDesktopKpiStripSlot ? (
              <motion.div
                id="workspace-kpi-panel"
                role="region"
                aria-label="Workspace KPI metrics"
                initial={false}
                animate={{
                  marginTop: kpiStripVisible ? 0 : '-0.75rem',
                  maxHeight: kpiStripVisible ? 480 : 0,
                  opacity: kpiStripVisible ? 1 : 0,
                }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        marginTop: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                        maxHeight: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.22, ease: 'easeOut' },
                      }
                }
                className={cn('overflow-hidden', !kpiStripVisible && 'pointer-events-none')}
              >
                <WorkspaceKpiPanel
                  workspaceStats={workspaceStats}
                  workspaceStatsLoading={workspaceStatsLoading}
                  workspaceTagVisibility={workspaceTagVisibility}
                  setWorkspaceTagVisibility={setWorkspaceTagVisibility}
                />
              </motion.div>
            ) : null}
            {isMobile && !focusMode && (
              <Sheet open={kpiStatsSheetOpen} onOpenChange={setKpiStatsSheetOpen}>
                <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
                  <SheetHeader className="shrink-0 border-b border-border px-3 pt-4">
                    <SheetTitle>{tLayout('workspaceStatsTitle')}</SheetTitle>
                    <SheetDescription>{tLayout('sheetStatsDescription')}</SheetDescription>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-2">
                    <WorkspaceKpiPanel
                      workspaceStats={workspaceStats}
                      workspaceStatsLoading={workspaceStatsLoading}
                      workspaceTagVisibility={workspaceTagVisibility}
                      setWorkspaceTagVisibility={setWorkspaceTagVisibility}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {(isMobile || focusMode) && (
              <Sheet open={conversationMenuOpen} onOpenChange={setConversationMenuOpen}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-md flex flex-col">
                  <SheetHeader className="border-b border-border shrink-0 px-3 pt-4">
                    <SheetTitle>{tLayout('sheetTitle')}</SheetTitle>
                    <SheetDescription>{tLayout('sheetMessagesDescription')}</SheetDescription>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3">
                    <InboxFiltersBar
                      segment={segment}
                      onSegmentChange={setSegment}
                      sort={sort}
                      onSortChange={setSort}
                      platform={inboxPlatform}
                      onPlatformChange={setInboxPlatform}
                      tag={tag}
                      onTagChange={setTag}
                      className="shrink-0 border-0 pb-0"
                    />
                    <div className="relative shrink-0">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={mobileSearchInputRef}
                        placeholder={tLayout('searchNamePlaceholder')}
                        className="h-9 bg-input pl-8 text-sm"
                        value={inboxSearch}
                        onChange={(e) => setInboxSearch(e.target.value)}
                      />
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
                      <ConversationList
                        conversations={conversations}
                        selectedKey={
                          selectedConversation ? conversationRowKey(selectedConversation) : undefined
                        }
                        onSelect={(conv) => {
                          setSelectedConversation(conv)
                          setConversationMenuOpen(false)
                        }}
                        hasMore={hasMoreInbox}
                        loadingMore={loadingMore}
                        onLoadMore={loadMoreInbox}
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MessagesLoadingShell() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-12">
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export function MessagesLayout(props: MessagesLayoutProps) {
  return (
    <Suspense fallback={<MessagesLoadingShell />}>
      <MessagesLayoutContent {...props} />
    </Suspense>
  )
}
