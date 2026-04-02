'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stripHtmlForPreview } from '@/lib/html-utils'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import { type Conversation, conversationRowKey } from './conversation-list'

type ConversationRailProps = {
  conversations: Conversation[]
  selectedKey?: string
  onSelect: (conversation: Conversation) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

function getTimeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function ConversationRail({
  conversations,
  selectedKey,
  onSelect,
  expanded,
  onExpandedChange,
}: ConversationRailProps) {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('search') ?? ''
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  const filtered = conversations.filter(
    (conv) =>
      conv.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const toggle = () => {
    const next = !expanded
    onExpandedChange(next)
    if (next) {
      window.dispatchEvent(new CustomEvent('messages:open-chats-menu'))
    }
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-[width] duration-300 ease-out',
        expanded ? 'w-[min(18rem,40vw)] min-w-[min(18rem,40vw)]' : 'w-[3.75rem] min-w-[3.75rem]',
      )}
    >
      <div className="flex shrink-0 items-center justify-center border-b border-border p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={toggle}
          aria-label={expanded ? 'Collapse conversation list' : 'Expand conversation list'}
          title={expanded ? 'Collapse conversation list' : 'Expand conversation list'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="shrink-0 border-b border-border px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              className="h-9 bg-input pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            {searchQuery ? 'No matches' : 'No chats'}
          </p>
        ) : expanded ? (
          <div className="space-y-0.5">
            {filtered.map((conv) => {
              const key = conversationRowKey(conv)
              const selected = selectedKey != null && selectedKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(conv)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                    selected ? 'bg-secondary' : 'hover:bg-secondary/50',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={proxyImageUrl(conv.user.avatar) || conv.user.avatar} alt="" />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {conv.user.name?.[0]?.toUpperCase() || conv.user.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-medium text-primary-foreground">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn('truncate font-medium', conv.unreadCount > 0 && 'text-foreground')}>
                        {conv.user.name || conv.user.username || 'Unknown'}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {conv.lastMessage?.createdAt ? getTimeAgo(conv.lastMessage.createdAt) : ''}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'truncate text-xs',
                        conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {stripHtmlForPreview(conv.lastMessage?.text) || 'Media message'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {filtered.map((conv) => {
              const key = conversationRowKey(conv)
              const selected = selectedKey != null && selectedKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(conv)}
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    selected ? 'border-primary bg-secondary' : 'border-transparent hover:bg-secondary/60',
                  )}
                  title={conv.user.name || conv.user.username || 'Chat'}
                  aria-label={conv.user.name || conv.user.username || 'Open chat'}
                >
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={proxyImageUrl(conv.user.avatar) || conv.user.avatar} alt="" />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {conv.user.name?.[0]?.toUpperCase() || conv.user.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-medium text-primary-foreground">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
