'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { uiFadeTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { Conversation } from './conversation-list'
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  DollarSign,
  MessageSquare,
  ShoppingBag,
  UserRound,
  Wrench,
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

export function RightDrawer({ conversation, onOpenFanProfile, fanContext }: RightDrawerProps) {
  const fan = conversation.user
  const { reduced } = useUiMotionPreferences()
  const fade = uiFadeTransition(reduced)
  const [profileOpen, setProfileOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(true)
  const [ordersOpen, setOrdersOpen] = useState(true)

  const recentOrders = useMemo(
    () =>
      (fanContext?.recentOrders ?? []).map((row) => ({
        ...row,
        amountLabel: `$${Math.round(row.amount).toLocaleString()}`,
      })),
    [fanContext?.recentOrders],
  )

  return (
    <Card className="flex min-h-0 w-full flex-col overflow-y-auto border-border bg-card/95 p-3.5 backdrop-blur-sm">
      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Fan profile</p>
      <div className="space-y-2.5">
        <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-8 w-full justify-between px-2 text-xs font-medium">
              Profile tool
              {profileOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade}
              className="rounded-xl border border-border bg-muted/25 p-3.5"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-1 ring-border/80">
                  <AvatarImage src={proxyImageUrl(fan.avatar) || fan.avatar} alt={fan.name || fan.username} />
                  <AvatarFallback>{(fan.name || fan.username || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold tracking-tight">{fan.name || fan.username || 'Unknown'}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{fan.username}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Member since {formatDateLabel(fanContext?.memberSince)}
                  </p>
                </div>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <Badge variant="outline">{conversation.platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}</Badge>
                {conversation.unreadCount > 0 ? <Badge variant="secondary">{conversation.unreadCount} unread</Badge> : null}
              </div>
              <div className="mt-3.5 space-y-2">
                <Button className="w-full" variant="outline" onClick={onOpenFanProfile}>
                  View full profile
                </Button>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-8 w-full justify-between px-2 text-xs font-medium">
              Fan stats
              {statsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /> Total messages</span>
                <span className="font-medium">{fanContext?.totalMessages ?? 0}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Total spent</span>
                <span className="font-medium">${Math.round(fanContext?.totalSpent ?? 0).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Last active</span>
                <span className="font-medium">{formatRelative(fanContext?.lastActive)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground"><UserRound className="h-3.5 w-3.5" /> Response rate</span>
                <span className="font-medium">
                  {fanContext?.responseRate != null ? `${fanContext.responseRate}%` : '—'}
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-8 w-full justify-between px-2 text-xs font-medium">
              Conversation tools
              {toolsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-xl border border-border bg-muted/20 p-1.5">
              {['Add to VIP list', 'Create broadcast', 'Add note', 'Mute notifications'].map((tool) => (
                <button
                  key={tool}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    {tool}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-8 w-full justify-between px-2 text-xs font-medium">
              Recent orders
              {ordersOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-xl border border-border bg-muted/20 p-1.5">
              {recentOrders.length > 0 ? (
                <>
                  {recentOrders.map((order) => (
                    <div key={order.id} className="grid grid-cols-[1fr_auto] items-center gap-2 px-2.5 py-2 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                        {order.title}
                      </span>
                      <span className="font-medium">{order.amountLabel}</span>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-xs">
                    View all orders
                  </Button>
                </>
              ) : (
                <p className="px-2.5 py-2 text-xs text-muted-foreground">No recent orders yet.</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  )
}
