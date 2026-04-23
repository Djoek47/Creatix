'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { uiFadeTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { Conversation } from './conversation-list'

type RightDrawerProps = {
  conversation: Conversation
  onOpenFanProfile: () => void
}

export function RightDrawer({ conversation, onOpenFanProfile }: RightDrawerProps) {
  const fan = conversation.user
  const { reduced } = useUiMotionPreferences()
  const fade = uiFadeTransition(reduced)
  return (
    <Card className="flex min-h-0 w-full flex-col overflow-hidden border-border bg-card/95 p-3.5 backdrop-blur-sm">
      <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Fan profile</p>
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
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Badge variant="outline">{conversation.platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}</Badge>
          {conversation.unreadCount > 0 ? <Badge variant="secondary">{conversation.unreadCount} unread</Badge> : null}
        </div>
      </motion.div>
      <div className="mt-3.5 space-y-2">
        <Button className="w-full" variant="outline" onClick={onOpenFanProfile}>
          Open full profile
        </Button>
      </div>
    </Card>
  )
}
