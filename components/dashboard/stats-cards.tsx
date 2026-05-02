'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Users, MessageSquare, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'
import { useAnalyticsMoney } from '@/components/dashboard/analytics-currency-context'

function formatNumber(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i))
  }
  return parts.join(',')
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const t = useTranslations('dashboard.statsCards')
  const { formatApiUsd } = useAnalyticsMoney()
  const hasConnectedPlatforms = stats.hasConnectedPlatforms

  const cards = [
    {
      titleKey: 'totalRevenue' as const,
      value: hasConnectedPlatforms ? formatApiUsd(stats.totalRevenue, 0) : '--',
      change: hasConnectedPlatforms ? stats.revenueChange : null,
      icon: DollarSign,
    },
    {
      titleKey: 'totalFans' as const,
      value: hasConnectedPlatforms ? formatNumber(stats.totalFans) : '--',
      change: hasConnectedPlatforms ? stats.fansChange : null,
      icon: Users,
    },
    {
      titleKey: 'activeConversations' as const,
      value: hasConnectedPlatforms ? formatNumber(stats.activeConversations) : '--',
      change: hasConnectedPlatforms ? stats.conversationsChange : null,
      icon: MessageSquare,
    },
    {
      titleKey: 'scheduledContent' as const,
      value: hasConnectedPlatforms ? formatNumber(stats.scheduledContent) : '--',
      change: hasConnectedPlatforms ? stats.contentChange : null,
      icon: Calendar,
    },
  ]

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card
          key={card.titleKey}
          className="overflow-hidden rounded-2xl border border-white/40 bg-white/45 shadow-[0_10px_36px_-20px_rgba(15,23,42,0.2)] backdrop-blur-xl backdrop-saturate-150 constellation-bg dark:border-white/[0.09] dark:bg-slate-950/40 dark:shadow-[0_14px_44px_-24px_rgba(0,0,0,0.48)]"
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/85">
                  {t(card.titleKey)}
                </p>
                <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-[1.65rem]">
                  {card.value}
                </p>
              </div>
              <div
                className={cn(
                  'shrink-0 rounded-2xl border border-white/45 p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] backdrop-blur-md dark:border-white/[0.10]',
                  i % 4 === 0 && 'bg-circe/[0.11] text-circe dark:bg-circe/[0.14]',
                  i % 4 === 1 && 'bg-gold/[0.11] text-gold dark:bg-gold/[0.12]',
                  i % 4 === 2 && 'bg-venus/[0.11] text-venus dark:bg-venus/[0.13]',
                  i % 4 === 3 && 'bg-primary/10 text-primary dark:bg-primary/[0.12]',
                )}
              >
                <card.icon className="h-5 w-5" aria-hidden />
              </div>
            </div>
            {card.change !== null ? (
              <div className="mt-4 flex items-center gap-1 text-sm">
                {card.change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={cn(
                    'font-medium',
                    card.change >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {card.change >= 0 ? '+' : ''}
                  {card.change}%
                </span>
                <span className="text-muted-foreground">{t('vsLastMonth')}</span>
              </div>
            ) : (
              <div className="mt-4 text-xs text-muted-foreground">
                {hasConnectedPlatforms ? t('noPriorPeriod') : t('connectToTrack')}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
