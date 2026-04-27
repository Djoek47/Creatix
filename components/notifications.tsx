'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { Bell, Check, MessageSquare, Shield, TrendingUp, Users, X, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { CRM_NOTIFICATION_ID_RE } from '@/lib/notification-briefing-types'
import {
  NOTIFICATIONS_INBOX_REFRESH_EVENT,
  registerNotificationUiHandlers,
} from '@/lib/dashboard/notification-ui-bridge'
import { executeNotificationSecretaryBriefing } from '@/lib/divine/notification-secretary-briefing-client'
import { stripHtml } from '@/lib/html-utils'
import {
  applyPullNotificationOverlay,
  clearPullDismissed,
  countPullDismissed,
  dismissPullNotification,
  markAllPullNotificationsRead,
  markPullNotificationRead,
} from '@/lib/platform-pull-notification-state'

type NotificationOrigin = 'platform_webhook' | 'divine_app' | 'platform_pull'

interface Notification {
  id: string
  type: 'message' | 'fan' | 'protection' | 'mention' | 'cosmic' | 'system'
  title: string
  description: string
  read: boolean
  created_at: string
  link?: string
  platform?: 'onlyfans' | 'fansly' | null
  avatar_url?: string | null
  origin?: NotificationOrigin | null
  platform_fan_id?: string | null
  metadata?: Record<string, unknown> | null
}

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'message':
      return <MessageSquare className="h-4 w-4 text-primary" />
    case 'fan':
      return <Users className="h-4 w-4 text-venus dark:text-venus" />
    case 'protection':
      return <Shield className="h-4 w-4 text-circe" />
    case 'mention':
      return <TrendingUp className="h-4 w-4 text-venus dark:text-venus" />
    case 'cosmic':
      return <Star className="h-4 w-4 text-primary" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

function isLiveOrigin(o: NotificationOrigin | null | undefined): boolean {
  return o == null || o === 'platform_webhook' || o === 'platform_pull'
}

function isDivineOrigin(o: NotificationOrigin | null | undefined): boolean {
  return o === 'divine_app'
}

/** Divine tab: DMCA/leaks, reputation, whale watch, billing, and Divine Manager–originated alerts. */
function isDivineProductNotification(n: Notification): boolean {
  if (!isDivineOrigin(n.origin)) return false
  const kind = typeof n.metadata?.kind === 'string' ? n.metadata.kind : null
  if (!kind) return true
  const primary = new Set([
    'leak_scan',
    'reputation_briefing',
    'whale_watch',
    'billing',
    'dmca',
  ])
  if (primary.has(kind)) return true
  if (kind.startsWith('divine_') || kind === 'task' || kind === 'intent') return true
  return false
}

export function Notifications() {
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([])
  const [ofPullNotifications, setOfPullNotifications] = useState<Notification[]>([])
  const [fanslyPullNotifications, setFanslyPullNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'live' | 'divine'>('live')
  const [briefingLoading, setBriefingLoading] = useState(false)
  /** Inline error / info when secretary cannot run (success opens Divine panel instead). */
  const [briefingText, setBriefingText] = useState<string | null>(null)
  /** Divine voice: scroll this CRM id into view when popover opens. */
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null)
  const supabase = createClient()
  /** Skip duplicate platform pull when popover opens shortly after prefetch for the same user (ms). */
  const onlyFansPullLastOkRef = useRef<{ userId: string | null; at: number }>({ userId: null, at: 0 })
  const fanslyPullLastOkRef = useRef<{ userId: string | null; at: number }>({ userId: null, at: 0 })

  const loadOnlyFansPull = useCallback(async (uid: string | null, opts?: { force?: boolean }) => {
    const force = opts?.force === true
    const last = onlyFansPullLastOkRef.current
    if (
      !force &&
      uid &&
      last.userId === uid &&
      last.at > 0 &&
      Date.now() - last.at < 30_000
    ) {
      return
    }
    try {
      const res = await fetch('/api/onlyfans/notifications')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error || !Array.isArray(json.notifications)) {
        setOfPullNotifications([])
        return
      }
      const ofNotifs: Notification[] = json.notifications.map((n: Record<string, unknown>) => ({
        id: `of-${String(n.id ?? n.notificationId ?? '')}`,
        type: 'system',
        title: stripHtml(
          typeof n.title === 'string' && n.title.trim().length
            ? n.title
            : typeof n.type === 'string'
              ? n.type
              : 'OnlyFans notification',
        ),
        description: stripHtml(
          typeof n.text === 'string' && n.text.trim().length
            ? n.text
            : typeof n.body === 'string' && n.body.trim().length
              ? n.body
              : typeof n.message === 'string'
                ? n.message
                : '',
        ),
        read: false,
        created_at:
          typeof n.createdAt === 'string'
            ? n.createdAt
            : typeof n.date === 'string'
              ? n.date
              : new Date().toISOString(),
        link: '/dashboard',
        platform: 'onlyfans',
        avatar_url: null,
        origin: 'platform_pull' as const,
      }))
      setOfPullNotifications(applyPullNotificationOverlay(uid, ofNotifs))
      onlyFansPullLastOkRef.current = { userId: uid, at: Date.now() }
    } catch {
      setOfPullNotifications([])
    }
  }, [])

  const loadFanslyPull = useCallback(async (uid: string | null, opts?: { force?: boolean }) => {
    const force = opts?.force === true
    const last = fanslyPullLastOkRef.current
    if (
      !force &&
      uid &&
      last.userId === uid &&
      last.at > 0 &&
      Date.now() - last.at < 30_000
    ) {
      return
    }
    try {
      const res = await fetch('/api/fansly/notifications')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error || !Array.isArray(json.notifications)) {
        setFanslyPullNotifications([])
        return
      }
      const fsNotifs: Notification[] = json.notifications.map((n: Record<string, unknown>) => {
        const fanId = typeof n.fanId === 'string' && n.fanId.trim().length ? n.fanId.trim() : ''
        return {
          id: `fs-${String(n.id ?? n.notificationId ?? '')}`,
          type: 'system',
          title: stripHtml(
            typeof n.title === 'string' && n.title.trim().length
              ? n.title
              : typeof n.type === 'string'
                ? n.type
                : 'Fansly notification',
          ),
          description: stripHtml(
            typeof n.text === 'string' && n.text.trim().length
              ? n.text
              : typeof n.body === 'string' && n.body.trim().length
                ? n.body
                : typeof n.message === 'string'
                  ? n.message
                  : '',
          ),
          read: false,
          created_at:
            typeof n.createdAt === 'string'
              ? n.createdAt
              : typeof n.date === 'string'
                ? n.date
                : new Date().toISOString(),
          link: fanId
            ? `/dashboard/messages?platform=fansly&chat=${encodeURIComponent(fanId)}`
            : '/dashboard/messages?platform=fansly',
          platform: 'fansly',
          avatar_url: null,
          origin: 'platform_pull' as const,
        }
      })
      setFanslyPullNotifications(applyPullNotificationOverlay(uid, fsNotifs))
      fanslyPullLastOkRef.current = { userId: uid, at: Date.now() }
    } catch {
      setFanslyPullNotifications([])
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDbNotifications([])
      setUserId(null)
      return
    }

    setUserId(user.id)

    const { data: dbNotifications, error } = await supabase
      .from('notifications')
      .select(
        'id, type, title, description, read, created_at, link, platform, avatar_url, origin, platform_fan_id, metadata',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading notifications:', error)
      setDbNotifications([])
      return
    }

    setDbNotifications((dbNotifications || []) as Notification[])
  }, [supabase])

  useEffect(() => {
    setMounted(true)
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    const onInboxRefresh = () => {
      void loadNotifications()
    }
    window.addEventListener(NOTIFICATIONS_INBOX_REFRESH_EVENT, onInboxRefresh)
    return () => window.removeEventListener(NOTIFICATIONS_INBOX_REFRESH_EVENT, onInboxRefresh)
  }, [loadNotifications])

  useEffect(() => {
    registerNotificationUiHandlers({
      setOpen: (next) => setOpen(next),
      setTab: (t) => setTab(t),
      requestScrollToId: (id) => {
        setScrollTargetId(id)
        if (id) setOpen(true)
      },
    })
    return () => registerNotificationUiHandlers(null)
  }, [])

  useEffect(() => {
    if (!open || !scrollTargetId) return
    const id = scrollTargetId
    const t = window.setTimeout(() => {
      try {
        const safe =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/"/g, '')
        const el = document.querySelector(`[data-notification-id="${safe}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } catch {
        const el = document.querySelector(`[data-notification-id="${id}"]`)
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
      setScrollTargetId(null)
    }, 150)
    return () => clearTimeout(t)
  }, [open, scrollTargetId])

  /** Prefetch platform pull feeds so the bell badge includes OF + Fansly without opening first. */
  useEffect(() => {
    if (!userId) return
    void loadOnlyFansPull(userId, { force: true })
    void loadFanslyPull(userId, { force: true })
  }, [userId, loadOnlyFansPull, loadFanslyPull])

  useEffect(() => {
    if (!open || !userId) return
    void loadOnlyFansPull(userId, { force: false })
    void loadFanslyPull(userId, { force: false })
  }, [open, userId, loadOnlyFansPull, loadFanslyPull])

  const liveDb = useMemo(
    () => dbNotifications.filter((n) => isLiveOrigin(n.origin)),
    [dbNotifications],
  )
  const divineDb = useMemo(
    () => dbNotifications.filter((n) => isDivineOrigin(n.origin)),
    [dbNotifications],
  )

  const liveList = useMemo(() => {
    const baseIds = new Set(liveDb.map((n) => n.id))
    const filteredOf = ofPullNotifications.filter((n) => !baseIds.has(n.id))
    const merged = [...liveDb, ...filteredOf]
    const mergedIds = new Set(merged.map((n) => n.id))
    const filteredFs = fanslyPullNotifications.filter((n) => !mergedIds.has(n.id))
    return [...merged, ...filteredFs]
  }, [liveDb, ofPullNotifications, fanslyPullNotifications])

  const divineList = useMemo(() => divineDb.filter(isDivineProductNotification), [divineDb])

  const displayed = tab === 'live' ? liveList : divineList

  const unreadCount = useMemo(() => {
    const dbUnread = dbNotifications.filter((n) => !n.read).length
    const ofUnread = ofPullNotifications.filter((n) => !n.read).length
    const fsUnread = fanslyPullNotifications.filter((n) => !n.read).length
    return dbUnread + ofUnread + fsUnread
  }, [dbNotifications, ofPullNotifications, fanslyPullNotifications])

  const runBriefing = async () => {
    setBriefingLoading(true)
    setBriefingText(null)
    try {
      const unreadUuids = displayed
        .filter((n) => !n.read && CRM_NOTIFICATION_ID_RE.test(n.id))
        .map((n) => n.id)
        .slice(0, 25)

      const pullOnlyUnread = displayed.filter(
        (n) => !n.read && !CRM_NOTIFICATION_ID_RE.test(n.id),
      ).length

      if (unreadUuids.length === 0) {
        setBriefingText(
          pullOnlyUnread > 0
            ? 'This walkthrough only uses saved inbox items. Open or clear the rows above first, or wait until they sync into your inbox.'
            : 'No unread saved notifications in this tab.',
        )
        return
      }

      const linksById: Record<string, string | undefined> = {}
      for (const n of displayed) {
        if (n.link) linksById[n.id] = n.link
      }

      if (!divinePanel) {
        setBriefingText('Divine panel is unavailable — refresh the page and try again.')
        return
      }

      setOpen(false)
      const result = await executeNotificationSecretaryBriefing({
        notificationIds: unreadUuids,
        linksById,
        openSecretaryFromBriefing: divinePanel.openSecretaryFromBriefing,
        voiceSession,
        voicePromptStyle: 'inbox',
      })
      if (!result.ok) {
        setBriefingText(result.error)
      }
    } catch {
      setBriefingText('Briefing failed')
    } finally {
      setBriefingLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    setDbNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setOfPullNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setFanslyPullNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

    if (id.startsWith('of-') || id.startsWith('fs-')) {
      if (userId) markPullNotificationRead(userId, id)
      return
    }

    if (userId) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error marking notification as read:', error)
      }
    }
  }

  const markAllAsRead = async () => {
    if (tab === 'live') {
      if (userId) {
        markAllPullNotificationsRead(userId, [
          ...ofPullNotifications.map((n) => n.id),
          ...fanslyPullNotifications.map((n) => n.id),
        ])
      }
      setOfPullNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setFanslyPullNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
    setDbNotifications((prev) => {
      const inChannel = prev.filter((n) =>
        tab === 'live' ? isLiveOrigin(n.origin) : isDivineOrigin(n.origin),
      )
      const ids = new Set(inChannel.map((n) => n.id))
      return prev.map((n) => (ids.has(n.id) ? { ...n, read: true } : n))
    })

    if (userId) {
      let q = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (tab === 'live') {
        // Include legacy rows where origin was null before migration.
        q = q.or('origin.is.null,origin.eq.platform_webhook,origin.eq.platform_pull')
      } else {
        q = q.eq('origin', 'divine_app')
      }

      const { error } = await q

      if (error) {
        console.error('Error marking all notifications as read:', error)
      }
    }
  }

  const removeNotification = async (id: string) => {
    setDbNotifications((prev) => prev.filter((n) => n.id !== id))
    setOfPullNotifications((prev) => prev.filter((n) => n.id !== id))
    setFanslyPullNotifications((prev) => prev.filter((n) => n.id !== id))

    if (id.startsWith('of-') || id.startsWith('fs-')) {
      if (userId) dismissPullNotification(userId, id)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      void loadNotifications()
      return
    }

    // Prefer: return deleted row so we get 200 + JSON (not 204) and can detect 0 rows (RLS / wrong id).
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')

    if (error) {
      console.error('Error removing notification:', error)
      void loadNotifications()
      return
    }

    if (!data?.length) {
      void loadNotifications()
    }
  }

  const channelUnread = displayed.filter((n) => !n.read).length
  const pullDismissedCount = userId ? countPullDismissed(userId) : 0

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full text-muted-foreground hover:bg-muted/35 hover:text-foreground sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) void loadNotifications()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full text-muted-foreground hover:bg-muted/35 hover:text-foreground sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'flex max-h-[min(80vh,420px)] min-h-0 w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:w-96',
          'rounded-2xl border border-white/45 bg-white/72 text-popover-foreground shadow-[0_24px_80px_-24px_rgba(15,23,42,0.32)] backdrop-blur-2xl backdrop-saturate-150',
          'dark:border-white/[0.10] dark:bg-slate-950/58 dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.62)]',
        )}
        align="end"
      >
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'live' | 'divine')}
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
        >
          <div className="flex flex-shrink-0 flex-col gap-3 border-b border-border/35 bg-foreground/[0.02] px-5 pb-4 pt-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[1.0625rem] font-semibold leading-none tracking-tight text-foreground">
                Notifications
              </h3>
              {channelUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 rounded-full border border-border/45 bg-background/45 px-3 text-[11px] font-medium text-foreground shadow-none transition-[background-color,border-color] duration-200 ease-out hover:bg-background/70"
                  onClick={markAllAsRead}
                >
                  Mark tab read
                </Button>
              )}
            </div>
            <TabsList className="!grid !h-auto min-h-0 w-full grid-cols-2 gap-1 overflow-visible rounded-xl border border-border/30 bg-background/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md dark:bg-white/[0.04]">
              <TabsTrigger
                value="live"
                className={cn(
                  '!h-auto min-h-[3.75rem] !items-start !justify-start flex-col gap-1 whitespace-normal rounded-lg border border-transparent py-2.5 pl-2.5 pr-2 text-left leading-snug transition-[background-color,box-shadow,border-color,color] duration-200 ease-out',
                  'data-[state=active]:border-border/40 data-[state=active]:bg-background/88 data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                  'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/40',
                )}
              >
                <span className="text-[13px] font-semibold tracking-tight">Live</span>
                <span className="flex min-w-0 flex-col gap-0.5 text-left">
                  <span className="text-[11px] font-medium leading-snug text-foreground/78">
                    OnlyFans & Fansly inbox
                  </span>
                  <span className="break-words text-[11px] font-normal leading-snug text-muted-foreground">
                    Saved webhooks
                  </span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="divine"
                className={cn(
                  '!h-auto min-h-[3.75rem] !items-start !justify-start flex-col gap-1 whitespace-normal rounded-lg border border-transparent py-2.5 pl-2.5 pr-2 text-left leading-snug transition-[background-color,box-shadow,border-color,color] duration-200 ease-out',
                  'data-[state=active]:border-border/40 data-[state=active]:bg-background/88 data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                  'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/40',
                )}
              >
                <span className="text-[13px] font-semibold tracking-tight">Divine</span>
                <span className="break-words text-[11px] font-normal leading-snug text-muted-foreground">
                  Leaks · reputation · whales · calendar
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
            <TabsContent value="live" className="m-0">
              {userId && pullDismissedCount > 0 ? (
                <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-foreground/[0.025] px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {pullDismissedCount} platform alert{pullDismissedCount === 1 ? '' : 's'} hidden. Restore them
                    below when you want them back in this list.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 shrink-0 whitespace-nowrap px-2 text-[11px]"
                    onClick={() => {
                      clearPullDismissed(userId)
                      void loadOnlyFansPull(userId, { force: true })
                      void loadFanslyPull(userId, { force: true })
                    }}
                  >
                    Show again
                  </Button>
                </div>
              ) : null}
              {liveList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No live notifications</p>
                  <p className="mt-1 px-4 text-xs text-muted-foreground/80">
                    New messages, tips, and subscriber activity from your connected accounts show up here as they
                    arrive.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/45">
                  {liveList.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      mounted={mounted}
                      markAsRead={markAsRead}
                      removeNotification={removeNotification}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="divine" className="m-0">
              {divineList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No Divine notifications</p>
                  <p className="mt-1 px-4 text-xs text-muted-foreground/80">
                    DMCA and leak scans, reputation mentions, whale watch for followed fans, billing, and Divine Manager actions show here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/45">
                  {divineList.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      mounted={mounted}
                      markAsRead={markAsRead}
                      removeNotification={removeNotification}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {briefingText && (
          <div className="max-h-28 flex-shrink-0 overflow-y-auto border-t border-border/40 bg-foreground/[0.02] px-4 py-3 text-xs text-muted-foreground backdrop-blur-sm">
            <p className="text-[11px] font-semibold tracking-tight text-foreground">Divine</p>
            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{briefingText}</p>
          </div>
        )}

        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-border/40 bg-foreground/[0.02] p-4 backdrop-blur-sm">
          <Button
            size="sm"
            className={cn(
              'h-10 w-full gap-2 rounded-xl border-0 bg-foreground font-medium text-background shadow-sm',
              'transition-opacity duration-200 ease-out hover:opacity-90',
              'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
            )}
            disabled={briefingLoading || !userId || !divinePanel}
            onClick={() => void runBriefing()}
          >
            {briefingLoading ? (
              'Briefing…'
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                Divine realtime briefing
              </>
            )}
          </Button>
          <p className="px-0.5 text-center text-[11px] leading-relaxed text-muted-foreground">
            Human-style voice + panel walkthrough. Each unread item is added to your protocol task list until you
            confirm it is handled. Uses saved unread in this tab only.
          </p>
          <Button
            variant="ghost"
            className="h-9 w-full justify-center rounded-lg text-sm text-muted-foreground transition-colors duration-200 hover:bg-background/50 hover:text-foreground"
            onClick={() => setOpen(false)}
            asChild
          >
            <a href="/dashboard/settings">View all settings</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationRow({
  notification,
  mounted,
  markAsRead,
  removeNotification,
}: {
  notification: Notification
  mounted: boolean
  markAsRead: (id: string) => void
  removeNotification: (id: string) => void
}) {
  return (
    <div
      data-notification-id={notification.id}
      className={cn(
        'relative flex gap-3 p-4 transition-colors duration-200 ease-out hover:bg-foreground/[0.04]',
        !notification.read && 'bg-foreground/[0.03]',
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {notification.platform ? (
          <div className="relative h-10 w-10">
            {notification.avatar_url ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                <Image
                  src={notification.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted ring-2 ring-border">
                {notification.platform === 'onlyfans' ? (
                  <img src={ONLYFANS_LOGO_SRC} alt="OnlyFans" className="h-5 w-auto max-w-[4.5rem] object-contain object-left" />
                ) : (
                  <img src={FANSLY_LOGO_SRC} alt="Fansly" className="h-5 w-auto max-w-[3.5rem] object-contain object-left" />
                )}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-muted overflow-hidden">
              {notification.platform === 'onlyfans' ? (
                <img src={ONLYFANS_LOGO_SRC} alt="" className="h-2.5 w-auto max-w-[2.25rem] object-contain object-left" />
              ) : (
                <img src={FANSLY_LOGO_SRC} alt="" className="h-2.5 w-auto max-w-[2rem] object-contain object-left" />
              )}
            </div>
          </div>
        ) : (
          getIcon(notification.type)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={notification.link || '#'}
          onClick={() => {
            markAsRead(notification.id)
          }}
          className="block"
        >
          <p className={cn('text-sm', !notification.read && 'font-medium')}>{stripHtml(notification.title)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{stripHtml(notification.description)}</p>
          {notification.origin === 'platform_pull' && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">Not saved to your inbox yet</p>
          )}
          {isDivineOrigin(notification.origin) && typeof notification.metadata?.kind === 'string' && (
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {String(notification.metadata.kind).replace(/_/g, ' ')}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground/70">
            {mounted ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : ''}
          </p>
        </a>
      </div>
      <div className="flex flex-shrink-0 gap-1">
        {!notification.read && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void markAsRead(notification.id)
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void removeNotification(notification.id)
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
