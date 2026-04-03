import Link from 'next/link'
import { Calendar, Shield, AtSign, MessageSquare, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type DashboardAtAGlanceProps = {
  scheduledContent: number
  leakAlerts: number
  mentionsToReview: number
  activeConversations: number
  hasConnectedPlatforms: boolean
}

const accentRing = [
  'border-circe/20 bg-circe/[0.06] text-circe',
  'border-gold/25 bg-gold/[0.06] text-gold',
  'border-primary/20 bg-primary/[0.05] text-primary',
  'border-venus/25 bg-venus/[0.06] text-venus',
] as const

export function DashboardAtAGlance({
  scheduledContent,
  leakAlerts,
  mentionsToReview,
  activeConversations,
  hasConnectedPlatforms,
}: DashboardAtAGlanceProps) {
  const tiles = [
    {
      href: '/dashboard/messages',
      label: 'Conversations',
      value: hasConnectedPlatforms ? String(activeConversations) : '—',
      hint: hasConnectedPlatforms ? 'Across synced platforms' : 'Connect OnlyFans to sync',
      icon: MessageSquare,
      accent: accentRing[0],
      emphasize: hasConnectedPlatforms && activeConversations > 0,
    },
    {
      href: '/dashboard/content',
      label: 'Scheduled',
      value: hasConnectedPlatforms ? String(scheduledContent) : '—',
      hint: 'Posts in the queue',
      icon: Calendar,
      accent: accentRing[1],
      emphasize: scheduledContent > 0,
    },
    {
      href: '/dashboard/protection',
      label: 'Protection',
      value: hasConnectedPlatforms ? String(leakAlerts) : '—',
      hint: leakAlerts > 0 ? 'Open leak alerts' : 'No active alerts',
      icon: Shield,
      accent: accentRing[2],
      emphasize: leakAlerts > 0,
    },
    {
      href: '/dashboard/mentions',
      label: 'Mentions',
      value: hasConnectedPlatforms ? String(mentionsToReview) : '—',
      hint: mentionsToReview > 0 ? 'Needs your review' : 'Inbox clear',
      icon: AtSign,
      accent: accentRing[3],
      emphasize: mentionsToReview > 0,
    },
  ] as const

  return (
    <Card className="overflow-hidden border-border/80 bg-card/90 shadow-sm constellation-bg backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight">Today and priorities</CardTitle>
        <CardDescription className="text-sm">
          {hasConnectedPlatforms
            ? 'Shortcuts to queues that usually need a pass today.'
            : (
                <span>
                  <Link
                    href="/dashboard/settings?tab=integrations"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Connect platforms
                  </Link>{' '}
                  to unlock live counts here.
                </span>
              )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 pb-4 sm:grid-cols-2 sm:gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={cn(
              'group flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:border-border hover:bg-background/80',
              tile.emphasize && 'ring-1 ring-gold/30',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                tile.accent,
              )}
            >
              <tile.icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tile.label}</p>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="font-serif text-xl font-semibold tabular-nums leading-tight">{tile.value}</p>
              <p className="truncate text-xs text-muted-foreground">{tile.hint}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
