'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Fan, Platform } from '@/lib/types'
import { useAnalyticsMoney } from '@/components/dashboard/analytics-currency-context'

function formatCurrency(amount: number): string {
  const str = Math.round(amount).toString()
  const parts: string[] = []
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i))
  }
  return parts.join(',')
}

interface RecentFansProps {
  fans: Fan[]
  totalFans?: number
}

const tierColors = {
  whale: 'bg-primary/20 text-primary border-primary/30',
  regular: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  new: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  inactive: 'bg-muted text-muted-foreground border-muted',
}

const platformColors: Record<Platform, string> = {
  onlyfans: 'bg-[#00AFF0]/20 text-[#00AFF0]',
  mym: 'bg-[#FF4D67]/20 text-[#FF4D67]',
  fansly: 'bg-[#009FFF]/20 text-[#009FFF]',
  manyvids: 'bg-violet-500/20 text-violet-400',
  loyalfans: 'bg-fuchsia-500/20 text-fuchsia-400',
}

const TIER_KEYS = new Set(['whale', 'regular', 'new', 'inactive'])

export function RecentFans({ fans, totalFans }: RecentFansProps) {
  const t = useTranslations('dashboard.recentFans')
  const { formatApiUsd } = useAnalyticsMoney()
  const hasImportedFans = fans.length > 0
  const hasAnyFans =
    hasImportedFans || (typeof totalFans === 'number' && totalFans > 0)

  const tierLabel = (raw: string) =>
    TIER_KEYS.has(raw) ? t(`tier.${raw as 'whale'}`) : raw

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </div>
        <Link href="/dashboard/fans">
          <Button variant="ghost" size="sm" className="gap-1">
            {t('viewAll')} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {!hasAnyFans ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">{t('emptyNoneTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('emptyNoneBody')}</p>
          </div>
        ) : !hasImportedFans && typeof totalFans === 'number' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">{t('emptySyncingTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('emptySyncingBody', { count: formatCurrency(totalFans) })}
            </p>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {t.rich('emptySyncingHint', {
                strong: (chunks) => <strong className="font-medium text-foreground">{chunks}</strong>,
              })}
            </p>
            <Button asChild variant="default" size="sm" className="mt-4">
              <Link href="/dashboard#dashboard-platform-sync">{t('goPlatformSync')}</Link>
            </Button>
          </div>
        ) : (
        <div className="space-y-4">
          {fans.map((fan) => (
            <div key={fan.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={fan.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {fan.display_name?.[0] || fan.platform_username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{fan.display_name || fan.platform_username}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-xs', platformColors[fan.platform])}>
                      {fan.platform.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t('spent', { amount: formatApiUsd(fan.total_spent, 0) })}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-xs capitalize', tierColors[fan.tier])}>
                {tierLabel(fan.tier)}
              </Badge>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
