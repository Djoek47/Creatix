'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InboxCrmPayload } from '@/lib/messages/inbox-crm'
import { ConversationRowButton } from '@/components/messages/conversation-row-button'

interface OnlyFansConversation {
  user: {
    id: string
    username: string
    name: string
    avatar: string
  }
  lastMessage: {
    id: string
    text: string
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
}

/** Merged OnlyFans + Fansly rows in Messages (see messages-layout). */
export type Conversation = OnlyFansConversation & {
  platform: 'onlyfans' | 'fansly'
  chatId?: string
  /** CRM merge from /api/messages/inbox (optional). */
  crm?: InboxCrmPayload | null
}

/** Stable row id + list key when the same numeric id can exist on OnlyFans and Fansly. */
export function conversationRowKey(c: Pick<Conversation, 'platform' | 'user'>): string {
  return `${c.platform}:${String(c.user.id)}`
}

interface ConversationListProps {
  conversations: Conversation[]
  /** Highlight row; use `conversationRowKey(selected)` so platform+id disambiguates. */
  selectedKey?: string
  onSelect: (conversation: Conversation) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function ConversationList({
  conversations,
  selectedKey,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
}: ConversationListProps) {
  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">None match</p>
            <p className="mt-1 text-xs text-muted-foreground">Adjust segments or search above</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const key = conversationRowKey(conv)
            const selected = selectedKey != null && selectedKey === key
            return (
              <ConversationRowButton key={key} conv={conv} selected={selected} onSelect={onSelect} />
            )
          })
        )}
        {hasMore && onLoadMore && (
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
