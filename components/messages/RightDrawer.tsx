'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { uiFadeTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import { cn } from '@/lib/utils'
import type { Conversation } from './conversation-list'
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  DollarSign,
  MessageSquare,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'

type RightDrawerFanContext = {
  memberSince?: string | null
  lastActive?: string | null
  totalMessages?: number | null
  totalSpent?: number | null
  responseRate?: number | null
  avgResponseTimeLabel?: string | null
  recentOrders?: Array<{ id: string; title: string; amount: number }>
}

type RightDrawerProps = {
  conversation: Conversation
  onOpenFanProfile: () => void
  fanContext?: RightDrawerFanContext | null
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const t = Date.parse(value)
  if (Number.isNaN(t)) return '—'
  return new Date(t).toLocaleDateString()
}

function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const t = Date.parse(value)
  if (Number.isNaN(t)) return '—'
  const diffMs = Date.now() - t
  if (diffMs < 60_000) return 'Now'
  if (diffMs < 3_600_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`
  if (diffMs < 86_400_000) return `${Math.max(1, Math.floor(diffMs / 3_600_000))}h ago`
  return `${Math.max(1, Math.floor(diffMs / 86_400_000))}d ago`
}

const disclosureTriggerClass =
  'flex h-11 w-full items-center justify-between rounded-lg px-1 text-left text-[13px] font-medium tracking-[-0.01em] text-foreground/90 transition-colors duration-150 hover:bg-foreground/[0.03] dark:hover:bg-white/[0.04]'

const statRowClass =
  'flex items-baseline justify-between gap-4 border-b border-border/15 py-3 last:border-0 dark:border-white/[0.06]'

export function RightDrawer({ conversation, onOpenFanProfile, fanContext }: RightDrawerProps) {
  const fan = conversation.user
  const { reduced } = useUiMotionPreferences()
  const fade = uiFadeTransition(reduced)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)

  const recentOrders = useMemo(
    () =>
      (fanContext?.recentOrders ?? []).map((row) => ({
        ...row,
        amountLabel: `$${Math.round(row.amount).toLocaleString()}`,
      })),
    [fanContext?.recentOrders],
  )

  return (
    <Card
      className={cn(
        'flex min-h-0 w-full flex-col overflow-y-auto rounded-2xl border border-white/35 bg-white/50 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)] backdrop-blur-2xl backdrop-saturate-150',
        'dark:border-white/[0.07] dark:bg-slate-950/42 dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.5)]',
      )}
    >
      {/* Identity — always visible, no accordion noise */}
      <div className="px-4 pb-5 pt-5 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">Fan</p>
        <div className="mt-4 flex gap-4">
          <Avatar className="h-14 w-14 shrink-0 rounded-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
            <AvatarImage src={proxyImageUrl(fan.avatar) || fan.avatar} alt={fan.name || fan.username} />
            <AvatarFallback className="rounded-2xl text-[15px] font-semibold">
              {(fan.name || fan.username || '?').slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.125rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              {fan.name || fan.username || 'Unknown'}
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground/88">@{fan.username}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/78">
              Member since {formatDateLabel(fanContext?.memberSince)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/35 bg-background/30 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {conversation.platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
              </span>
              {conversation.unreadCount > 0 ? (
                <span className="rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-foreground/85 dark:bg-white/[0.08]">
                  {conversation.unreadCount} unread
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          className="mt-5 h-10 w-full rounded-xl text-[13px] font-semibold tracking-[-0.01em] shadow-sm"
          onClick={onOpenFanProfile}
        >
          Open full profile
        </Button>
      </div>

      {/* Activity — calm metrics, hairline rows */}
      <div className="border-t border-border/20 px-4 py-1 sm:px-5 dark:border-white/[0.06]">
        <p className="py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">Activity</p>
        <div className="pb-3">
          <div className={statRowClass}>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground/85">
              <MessageSquare className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Messages
            </span>
            <span className="text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
              {fanContext?.totalMessages ?? 0}
            </span>
          </div>
          <div className={statRowClass}>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground/85">
              <DollarSign className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Spend
            </span>
            <span className="text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
              ${Math.round(fanContext?.totalSpent ?? 0).toLocaleString()}
            </span>
          </div>
          <div className={statRowClass}>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground/85">
              <Clock3 className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Last active
            </span>
            <span className="text-[13px] font-medium tabular-nums text-foreground/90">
              {formatRelative(fanContext?.lastActive)}
            </span>
          </div>
          <div className={statRowClass}>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground/85">
              <UserRound className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Response rate
            </span>
            <span className="text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
              {fanContext?.responseRate != null ? `${fanContext.responseRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border/20 dark:border-white/[0.06]">
        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className={disclosureTriggerClass}>
              <span>Shortcuts</span>
              {toolsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground/70" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade}
              className="space-y-0.5 px-1 pb-4"
            >
              {['Add to VIP list', 'Create broadcast', 'Add note', 'Mute notifications'].map((tool) => (
                <button
                  key={tool}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[12px] font-medium text-foreground/85 transition-colors duration-150 hover:bg-foreground/[0.04] dark:hover:bg-white/[0.04]"
                >
                  {tool}
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" aria-hidden />
                </button>
              ))}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className={cn(disclosureTriggerClass, 'border-t border-border/15 dark:border-white/[0.05]')}>
              <span>Recent orders</span>
              {ordersOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground/70" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-0 px-1 pb-4">
              {recentOrders.length > 0 ? (
                <>
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-baseline justify-between gap-3 border-b border-border/10 px-3 py-2.5 last:border-0 dark:border-white/[0.05]"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 text-[12px] text-foreground/88">
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" aria-hidden />
                        <span className="truncate">{order.title}</span>
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-foreground">
                        {order.amountLabel}
                      </span>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="mt-1 h-9 w-full justify-center rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground">
                    View all orders
                  </Button>
                </>
              ) : (
                <p className="px-3 py-2 text-[12px] leading-relaxed text-muted-foreground/80">No recent orders yet.</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  )
}
