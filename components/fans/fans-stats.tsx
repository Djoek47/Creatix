'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Crown, DollarSign, Activity } from 'lucide-react'

// Manual number formatting to avoid hydration mismatch (no Intl/locale dependency)
function formatNumber(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i))
  }
  return parts.join(',')
}

type PlatformScope = 'all' | 'onlyfans' | 'fansly'

/** First number = synced fan/subscriber count; second = free / non-sub follows when the API provides it. */
function platformSublabel(name: 'OnlyFans' | 'Fansly', fans: number, follows: number): string {
  if (fans <= 0 && follows <= 0) return ''
  if (follows > 0) {
    return `${name} ${formatNumber(fans)} · ${formatNumber(follows)} follows`
  }
  return `${name} ${formatNumber(fans)}`
}

interface FansStatsProps {
  stats: {
    totalFans: number
    whales: number
    totalRevenue: number
    activeFans: number
  }
  platformScope?: PlatformScope
  snapshotFansByPlatform?: Record<string, number>
  snapshotFollowsByPlatform?: Record<string, number>
}

export function FansStats({
  stats,
  platformScope = 'all',
  snapshotFansByPlatform = {},
  snapshotFollowsByPlatform = {},
}: FansStatsProps) {
  const ofSnap = snapshotFansByPlatform.onlyfans ?? 0
  const flSnap = snapshotFansByPlatform.fansly ?? 0
  const ofFollows = snapshotFollowsByPlatform.onlyfans ?? 0
  const flFollows = snapshotFollowsByPlatform.fansly ?? 0
  const showBreakdown =
    platformScope === 'all' && (ofSnap > 0 || flSnap > 0 || ofFollows > 0 || flFollows > 0)
  const totalFansSublabel = showBreakdown
    ? [platformSublabel('OnlyFans', ofSnap, ofFollows), platformSublabel('Fansly', flSnap, flFollows)]
        .filter((s) => s.length > 0)
        .join(' · ')
    : undefined

  const cards = [
    {
      title: 'Total Fans',
      value: formatNumber(stats.totalFans),
      sublabel: totalFansSublabel,
      icon: Users,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: 'Whale Tier',
      value: formatNumber(stats.whales),
      sublabel: undefined,
      icon: Crown,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
    {
      title: 'Total Revenue',
      value: `$${formatNumber(stats.totalRevenue)}`,
      sublabel: undefined,
      icon: DollarSign,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Active Fans',
      value: formatNumber(stats.activeFans),
      sublabel: undefined,
      icon: Activity,
      color: 'text-chart-5',
      bgColor: 'bg-chart-5/10',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-3 ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-xl font-bold">{card.value}</p>
              {card.sublabel ? (
                <p className="text-xs text-muted-foreground mt-0.5">{card.sublabel}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
