'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Conversation, conversationRowKey } from './conversation-list'
import { ConversationRowButton } from './conversation-row-button'
import { InboxFiltersBar } from './inbox-filters-bar'
import type { InboxSegment, InboxSort, InboxPlatformFilter } from '@/lib/messages/inbox-crm'

type ConversationRailProps = {
  conversations: Conversation[]
  selectedKey?: string
  onSelect: (conversation: Conversation) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  segment: InboxSegment
  onSegmentChange: (s: InboxSegment) => void
  sort: InboxSort
  onSortChange: (s: InboxSort) => void
  platform: InboxPlatformFilter
  onPlatformChange: (p: InboxPlatformFilter) => void
  platformOptions?: InboxPlatformFilter[]
  tag: string
  onTagChange: (t: string) => void
  /** Controlled search (parent debounces for API). */
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  searchInputRef?: RefObject<HTMLInputElement | null>
}

export function ConversationRail({
  conversations,
  selectedKey,
  onSelect,
  expanded,
  onExpandedChange,
  segment,
  onSegmentChange,
  sort,
  onSortChange,
  platform,
  onPlatformChange,
  platformOptions,
  tag,
  onTagChange,
  searchQuery,
  onSearchQueryChange,
  hasMore,
  loadingMore,
  onLoadMore,
  searchInputRef,
}: ConversationRailProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 8,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [expanded, conversations.length, virtualizer])

  const toggle = () => {
    const next = !expanded
    onExpandedChange(next)
    if (next) {
      window.dispatchEvent(new CustomEvent('messages:open-chats-menu'))
    }
  }

  useEffect(() => {
    const el = parentRef.current
    if (!el || !onLoadMore || !hasMore || loadingMore) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight - scrollTop - clientHeight < 120) {
        onLoadMore()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onLoadMore, hasMore, loadingMore, conversations.length])

  return (
    <div
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/55 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.3)] backdrop-blur-2xl backdrop-saturate-150 transition-[width,box-shadow] duration-300 ease-out',
        'dark:border-white/[0.10] dark:bg-slate-950/48 dark:shadow-[0_22px_65px_-30px_rgba(0,0,0,0.55)]',
        /* Fixed readable width — inbox chrome stays legible; center chat gets all remaining flex space */
        expanded ? 'w-64 min-w-64 max-w-64 sm:w-[17rem] sm:min-w-[17rem] sm:max-w-[17rem]' : 'w-[3.75rem] min-w-[3.75rem] max-w-[3.75rem]',
      )}
    >
      <div className="flex shrink-0 items-center justify-center border-b border-border/35 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={toggle}
          aria-label={expanded ? 'Collapse conversation list' : 'Expand conversation list'}
          title={expanded ? 'Collapse conversation list' : 'Expand conversation list'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <>
          <InboxFiltersBar
            segment={segment}
            onSegmentChange={onSegmentChange}
            sort={sort}
            onSortChange={onSortChange}
            platform={platform}
            onPlatformChange={onPlatformChange}
            platformOptions={platformOptions}
            tag={tag}
            onTagChange={onTagChange}
            className="shrink-0 px-3 pt-2"
          />
          <div className="shrink-0 border-b border-border/35 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search name…"
                className="h-9 rounded-xl bg-background/80 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
        {conversations.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            {searchQuery.trim()
              ? 'No matches'
              : segment !== 'all' || platform !== 'all' || tag.trim()
                ? 'None match — try All or clear filters'
                : 'No chats'}
          </p>
        ) : expanded ? (
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const conv = conversations[vi.index]
              if (!conv) return null
              const key = conversationRowKey(conv)
              const selected = selectedKey != null && selectedKey === key
              return (
                <div
                  key={key}
                  className="absolute left-0 top-0 w-full pr-0.5"
                  style={{
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <ConversationRowButton conv={conv} selected={selected} onSelect={onSelect} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {conversations.map((conv) => {
              const key = conversationRowKey(conv)
              const selected = selectedKey != null && selectedKey === key
              return (
                <ConversationRowButton
                  key={key}
                  conv={conv}
                  selected={selected}
                  onSelect={onSelect}
                  compact
                />
              )
            })}
          </div>
        )}
        {expanded && hasMore && (
          <div className="flex justify-center py-2">
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={onLoadMore}>
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
