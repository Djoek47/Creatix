'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ConversationList, conversationRowKey, type Conversation } from './conversation-list'
import { ConversationRail } from './conversation-rail'
import { useIsMobile } from '@/hooks/use-mobile'
import { ChatWindow } from './chat-window'
import { MassMessageDialog } from './mass-message-dialog'
import { MessageEngagementInsights } from './message-engagement-insights'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'
import { InboxFiltersBar } from '@/components/messages/inbox-filters-bar'
import { cn } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  RefreshCw,
  Loader2,
  ArrowLeft,
  BarChart3,
  MessageSquare,
  Megaphone,
  PanelLeft,
  User,
  Search,
} from 'lucide-react'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import type {
  InboxSegment,
  InboxSort,
  InboxPlatformFilter,
} from '@/lib/messages/inbox-crm'

type MessagesView = 'conversations' | 'insights'

const INBOX_LIMIT = 40

interface MessagesLayoutProps {
  userId: string
  /** From server: `?fanId=` (voice/Divine) or `?chat=` (dashboard links) on first paint. */
  initialFanId?: string
  /** From server: `?platform=onlyfans|fansly` when using `chat=`. */
  initialPlatform?: string
  /** True when OnlyFans or Fansly is connected (Integrations). Empty inbox is not always “not connected”. */
  hasFanPlatformConnected?: boolean
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

function MessagesLayoutContent({
  userId,
  initialFanId,
  initialPlatform,
  hasFanPlatformConnected = false,
}: MessagesLayoutProps) {
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
  const [fanProfileOpen, setFanProfileOpen] = useState(false)
  /** Desktop: false = avatar-only rail; true = expanded with names + last message. */
  const [chatsRailExpanded, setChatsRailExpanded] = useState(false)
  const isMobile = useIsMobile()

  const [segment, setSegment] = useState<InboxSegment>('all')
  const [sort, setSort] = useState<InboxSort>('recent')
  const [inboxPlatform, setInboxPlatform] = useState<InboxPlatformFilter>('all')
  const [tag, setTag] = useState('')
  const [inboxSearch, setInboxSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [hasMoreInbox, setHasMoreInbox] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const listOffsetRef = useRef(0)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(inboxSearch.trim()), 320)
    return () => window.clearTimeout(t)
  }, [inboxSearch])

  const dispatchCollapseDashboardSidebar = useCallback(() => {
    if (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) {
      window.dispatchEvent(new CustomEvent('messages:open-chats-menu'))
    }
  }, [pathname])

  /** Mobile: open sheet. Desktop: toggle chat rail expand (collapse dashboard when expanding). */
  const openChatsMenu = useCallback(() => {
    if (isMobile) {
      setConversationMenuOpen(true)
      dispatchCollapseDashboardSidebar()
    } else {
      setChatsRailExpanded((prev) => {
        const next = !prev
        if (next) dispatchCollapseDashboardSidebar()
        return next
      })
    }
  }, [isMobile, dispatchCollapseDashboardSidebar])

  useEffect(() => {
    setFanProfileOpen(false)
  }, [selectedConversation?.user.id, selectedConversation?.platform])

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
        const res = await fetch(`/api/messages/inbox?${params}`, { credentials: 'include' })
        const data = (await res.json()) as {
          conversations?: Conversation[]
          error?: string
          code?: string
          message?: string
          hasMore?: boolean
          nextOffset?: number
        }

        if (!res.ok) {
          const msg =
            data.message || data.error || `Failed to load inbox (${res.status})`
          if (data.code === 'ONLYFANS_SESSION_EXPIRED') {
            setError(
              'OnlyFans session expired. Reconnect OnlyFans in Settings to load messages.',
            )
          } else {
            setError(msg)
          }
          return
        }

        const rows = data.conversations ?? []
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
        setError(err instanceof Error ? err.message : 'Failed to load conversations')
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    },
    [segment, sort, inboxPlatform, tag, searchDebounced],
  )

  useEffect(() => {
    void loadInbox()
  }, [segment, sort, inboxPlatform, tag, searchDebounced, loadInbox])

  const loadMoreInbox = useCallback(() => {
    if (loadingMore || !hasMoreInbox) return
    void loadInbox({ append: true })
  }, [loadInbox, loadingMore, hasMoreInbox])

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
          <p className="text-sm text-muted-foreground">Loading messages...</p>
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
          <h3 className="text-lg font-medium">Failed to Load Messages</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void loadInbox()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No Messages Yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasFanPlatformConnected
              ? 'Your inbox is empty right now — new threads will show when fans message you. Tap Refresh to pull the latest from the platform, or open a conversation on OnlyFans to seed activity.'
              : 'Connect OnlyFans or Fansly in Settings → Integrations so Circe can load your conversations here.'}
          </p>
          <Button onClick={() => void loadInbox({ refresh: true })} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)] sm:max-h-none">
      {/* Header: back on mobile when chat open, title, view toggle, actions */}
      <div className="mb-2 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {selectedConversation && view === 'conversations' && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 flex-shrink-0"
              onClick={openChatsMenu}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {view === 'conversations' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 md:hidden"
              onClick={openChatsMenu}
            >
              <PanelLeft className="h-3.5 w-3.5" />
              Chats
            </Button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {view === 'insights'
                ? 'Insights · direct & mass performance'
                : `${conversations.length} thread${conversations.length === 1 ? '' : 's'} · CRM segments · OnlyFans & Fansly`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              variant={view === 'conversations' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('conversations')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chats
            </Button>
            <Button
              variant={view === 'insights' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('insights')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Insights
            </Button>
          </div>
          {view === 'conversations' && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={openChatsMenu}
                aria-label="Open conversations menu"
                title="Open conversations menu"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => void loadInbox({ refresh: true })}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex" asChild>
                <Link href="/dashboard/messages/mass">
                  <Megaphone className="h-4 w-4" />
                  Mass page
                </Link>
              </Button>
              <MassMessageDialog />
            </>
          )}
        </div>
      </div>

      {view === 'insights' ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <MessageEngagementInsights />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {selectedConversation && (
            <>
              <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-center">
                  <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarImage
                      src={proxyImageUrl(selectedConversation.user.avatar) || selectedConversation.user.avatar}
                      alt=""
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedConversation.user.name?.[0]?.toUpperCase() ||
                        selectedConversation.user.username?.[0]?.toUpperCase() ||
                        '?'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setFanProfileOpen(true)}
                    title="Open fan profile"
                    aria-label="Open fan profile"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1 text-center sm:max-w-none sm:flex-none sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                      <span className="truncate text-sm font-medium">
                        {selectedConversation.user.name || selectedConversation.user.username || 'Unknown'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          selectedConversation.platform === 'onlyfans'
                            ? 'bg-sky-500/10 text-sky-500'
                            : 'bg-blue-500/10 text-blue-500',
                        )}
                      >
                        <img
                          src={
                            selectedConversation.platform === 'onlyfans' ? '/onlyfans-logo.png' : '/fansly-logo.png'
                          }
                          alt={selectedConversation.platform}
                          className="h-3 w-3"
                        />
                        {selectedConversation.platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{selectedConversation.user.username}
                    </p>
                  </div>
                </div>
              </div>
              <FanProfileModal
                open={fanProfileOpen}
                onOpenChange={setFanProfileOpen}
                fanId={String(selectedConversation.user.id)}
                platform={selectedConversation.platform === 'onlyfans' ? 'onlyfans' : 'fansly'}
                initialUsername={selectedConversation.user.username}
                initialName={selectedConversation.user.name}
                initialAvatar={selectedConversation.user.avatar}
              />
            </>
          )}
          <div className="flex min-h-0 flex-1 gap-2">
            {!isMobile && (
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
              />
            )}
            <ChatWindow
              conversation={selectedConversation}
              userId={userId}
              chatterDraftOutboxId={chatterDraftOutboxId}
              onMessageSent={() => void loadInbox({ refresh: true })}
              onOpenFanProfile={() => setFanProfileOpen(true)}
            />
            {isMobile && (
              <Sheet open={conversationMenuOpen} onOpenChange={setConversationMenuOpen}>
                <SheetContent side="right" className="w-full p-0 sm:max-w-md flex flex-col">
                  <SheetHeader className="border-b border-border shrink-0 px-3 pt-4">
                    <SheetTitle>Messages</SheetTitle>
                    <SheetDescription>
                      Segments, search, then pick a thread.
                    </SheetDescription>
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
                        placeholder="Search name…"
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
          </div>
        </div>
      )}
    </div>
  )
}

function MessagesLoadingShell() {
  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
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
