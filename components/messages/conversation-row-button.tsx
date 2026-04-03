'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { stripHtmlForPreview } from '@/lib/html-utils'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { Conversation } from './conversation-list'

function formatSpend(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  if (n >= 100) return `$${Math.round(n)}`
  if (n > 0) return `$${n.toFixed(0)}`
  return ''
}

function formatTenure(days: number | null | undefined): string | null {
  if (days == null || days < 0) return null
  if (days < 1) return 'new'
  if (days < 14) return `${days}d fan`
  if (days < 60) return `${Math.floor(days / 7)}w fan`
  return `${Math.floor(days / 30)}mo fan`
}

export function getTimeAgoShort(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

type ConversationRowButtonProps = {
  conv: Conversation
  selected: boolean
  onSelect: (c: Conversation) => void
  compact?: boolean
}

export function ConversationRowButton({
  conv,
  selected,
  onSelect,
  compact = false,
}: ConversationRowButtonProps) {
  const crm = conv.crm
  const spend = crm ? formatSpend(crm.totalSpent) : ''
  const tenure = formatTenure(crm?.fanTenureDays)
  const badges = crm?.audienceBadges?.slice(0, 2) ?? []

  if (compact) {
    return (
      <button
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
  }

  return (
    <button
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
            {conv.lastMessage?.createdAt ? getTimeAgoShort(conv.lastMessage.createdAt) : ''}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {badges.map((b) => (
            <Badge
              key={b.key}
              variant="outline"
              className={cn('h-4 px-1 text-[9px] font-normal leading-none', b.className)}
            >
              {b.label}
            </Badge>
          ))}
          {spend ? (
            <span className="text-[10px] text-muted-foreground tabular-nums">{spend}</span>
          ) : null}
          {tenure ? (
            <span className="text-[10px] text-muted-foreground/80">{tenure}</span>
          ) : null}
          {crm?.churnRisk === 'high' || crm?.churnRisk === 'critical' ? (
            <Badge
              variant="outline"
              className="h-4 border-amber-500/45 bg-amber-500/10 px-1 text-[9px] font-medium leading-none text-amber-800 dark:text-amber-200"
              title={crm.churnOneLine || 'Churn risk from background digest'}
            >
              churn
            </Badge>
          ) : null}
          {!crm && (
            <span className="text-[9px] text-muted-foreground/70" title="CRM not synced yet">
              —
            </span>
          )}
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
}

