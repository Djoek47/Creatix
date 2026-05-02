'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { useAnalyticsMoney } from '@/components/dashboard/analytics-currency-context'
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
function platformSublabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  name: string,
  fans: number,
  follows: number,
): string {
  if (fans <= 0 && follows <= 0) return ''
  if (follows > 0) {
    return t('stats.platformWithFollows', {
      name,
      fans: formatNumber(fans),
      follows: formatNumber(follows),
    })
  }
  return t('stats.platformFansOnly', { name, fans: formatNumber(fans) })
}

interface FansStatsProps {
  stats: {
    totalFans: number
    /** Current list length when it differs from headline (filters, live source, etc.). */
    rowsInView?: number
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
  const t = useTranslations('fans')
  const { formatApiUsd } = useAnalyticsMoney()
  const ofSnap = snapshotFansByPlatform.onlyfans ?? 0
  const flSnap = snapshotFansByPlatform.fansly ?? 0
  const ofFollows = snapshotFollowsByPlatform.onlyfans ?? 0
  const flFollows = snapshotFollowsByPlatform.fansly ?? 0
  const showBreakdown =
    platformScope === 'all' && (ofSnap > 0 || flSnap > 0 || ofFollows > 0 || flFollows > 0)
  const totalFansSublabel = showBreakdown
    ? [
        platformSublabel(t, t('platform.onlyfansAlt'), ofSnap, ofFollows),
        platformSublabel(t, t('platform.fanslyAlt'), flSnap, flFollows),
      ]
        .filter((s) => s.length > 0)
        .join(' · ')
    : undefined

  const totalFansFootnote =
    stats.rowsInView != null && stats.rowsInView !== stats.totalFans
      ? t('stats.inViewFootnote', { count: formatNumber(stats.rowsInView) })
      : undefined

  const cards: Array<{
    title: string
    value: string
    sublabel?: string
    footnote?: string
    icon: typeof Users
    color: string
    bgColor: string
  }> = useMemo(
    () => [
      {
        title: t('stats.totalFans'),
        value: formatNumber(stats.totalFans),
        sublabel: totalFansSublabel,
        footnote: totalFansFootnote,
        icon: Users,
        color: 'text-chart-1',
        bgColor: 'bg-chart-1/10',
      },
      {
        title: t('stats.whaleTier'),
        value: formatNumber(stats.whales),
        sublabel: undefined,
        footnote: undefined,
        icon: Crown,
        color: 'text-chart-4',
        bgColor: 'bg-chart-4/10',
      },
      {
        title: t('stats.totalRevenue'),
        value: formatApiUsd(stats.totalRevenue, 0),
        sublabel: undefined,
        footnote: undefined,
        icon: DollarSign,
        color: 'text-chart-2',
        bgColor: 'bg-chart-2/10',
      },
      {
        title: t('stats.activeFans'),
        value: formatNumber(stats.activeFans),
        sublabel: undefined,
        footnote: undefined,
        icon: Activity,
        color: 'text-chart-5',
        bgColor: 'bg-chart-5/10',
      },
    ],
    [
      formatApiUsd,
      stats.activeFans,
      stats.totalFans,
      stats.totalRevenue,
      stats.whales,
      totalFansFootnote,
      totalFansSublabel,
      t,
    ],
  )

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
              {card.footnote ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground/90">{card.footnote}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
