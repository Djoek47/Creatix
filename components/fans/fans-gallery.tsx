'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  MessageSquare,
  Star,
  Ban,
  Eye,
  Loader2,
  Sparkles,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { Fan } from '@/lib/types'
import Link from 'next/link'
import { FanAiSummaryDialog } from '@/components/fans/fan-ai-summary-dialog'
import { fanSubscriptionCommerceLine } from '@/lib/fans/fan-commerce-label'
import {
  fanDisplayMemberSinceIso,
  fanDisplayPeriodEndIso,
} from '@/lib/fans/fan-display-dates'
import { formatFanDateUtc } from '@/lib/fans/crm-format'
import { useAnalyticsMoney } from '@/components/dashboard/analytics-currency-context'
import { useFansGalleryColumns } from '@/hooks/use-fans-gallery-columns'
import { FansListEmptyConnected, FansListEmptyDisconnected, type FansListPlatformScope } from '@/components/fans/fans-list-empty'

interface FansGalleryProps {
  fans: Fan[]
  filteredCountBeforeSearch?: number
  searchMismatch?: boolean
  searchTerm?: string
  hasFanPlatformsConnected?: boolean
  hasOnlyFansConnected?: boolean
  hasFanslyConnected?: boolean
  platformScope?: FansListPlatformScope
  onEmptyQuickSync?: () => void
  emptyQuickSyncBusy?: boolean
  loading?: boolean
  liveFilter?: 'active' | 'expired' | 'latest' | 'top'
  showSubscriptionEnd?: boolean
}

const GALLERY_VIRTUAL_THRESHOLD = 36
const GALLERY_ROW_ESTIMATE_PX = 480

const tierColors = {
  whale: 'bg-primary/20 text-primary border-primary/30',
  regular: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  new: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  inactive: 'bg-muted text-muted-foreground border-border',
}

function hasSpendChannelsTracked(fan: Fan): boolean {
  return [fan.spend_subscriptions, fan.spend_tips, fan.spend_messages, fan.spend_posts].some(
    (v) => v != null,
  )
}

function spendSegments(fan: Fan) {
  return {
    sub: Math.max(0, fan.spend_subscriptions ?? 0),
    tips: Math.max(0, fan.spend_tips ?? 0),
    dms: Math.max(0, fan.spend_messages ?? 0),
    feed: Math.max(0, fan.spend_posts ?? 0),
  }
}

function SpendMixBar({ fan }: { fan: Fan }) {
  const t = useTranslations('fans.gallery')
  const { formatApiUsd } = useAnalyticsMoney()
  const { sub, tips, dms, feed } = spendSegments(fan)
  const sum = sub + tips + dms + feed
  if (sum <= 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {t('spendMixEmpty', { amount: formatApiUsd(0, 0) })}
      </p>
    )
  }
  const pct = (n: number) => `${Math.max(2, (n / sum) * 100)}%`
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {sub > 0 ? (
          <div
            className="bg-chart-2 h-full min-w-[4px] transition-all"
            style={{ width: pct(sub) }}
            title={t('spendTitleSub', { amount: formatApiUsd(sub, 0) })}
          />
        ) : null}
        {tips > 0 ? (
          <div
            className="h-full min-w-[4px] bg-amber-500/80 transition-all"
            style={{ width: pct(tips) }}
            title={t('spendTitleTips', { amount: formatApiUsd(tips, 0) })}
          />
        ) : null}
        {dms > 0 ? (
          <div
            className="h-full min-w-[4px] bg-violet-500/75 transition-all"
            style={{ width: pct(dms) }}
            title={t('spendTitleDms', { amount: formatApiUsd(dms, 0) })}
          />
        ) : null}
        {feed > 0 ? (
          <div
            className="h-full min-w-[4px] bg-teal-500/75 transition-all"
            style={{ width: pct(feed) }}
            title={t('spendTitleFeed', { amount: formatApiUsd(feed, 0) })}
          />
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground sm:grid-cols-4">
        <li>
          <span className="text-chart-2">{t('spendSub')}</span> {formatApiUsd(sub, 0)}
        </li>
        <li>
          <span className="text-amber-600 dark:text-amber-400">{t('spendTips')}</span> {formatApiUsd(tips, 0)}
        </li>
        <li>
          <span className="text-violet-600 dark:text-violet-400">{t('spendDms')}</span> {formatApiUsd(dms, 0)}
        </li>
        <li>
          <span className="text-teal-600 dark:text-teal-400">{t('spendFeed')}</span> {formatApiUsd(feed, 0)}
        </li>
      </ul>
    </div>
  )
}

function chunkFans<T>(arr: T[], size: number): T[][] {
  if (size < 1) return []
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function FansGalleryCard({
  fan,
  liveFilter,
  showSubscriptionEnd,
  onOpenSummary,
}: {
  fan: Fan
  liveFilter?: FansGalleryProps['liveFilter']
  showSubscriptionEnd: boolean
  onOpenSummary: (fan: Fan) => void
}) {
  const t = useTranslations('fans')
  const tg = useTranslations('fans.gallery')
  const { formatApiUsd } = useAnalyticsMoney()
  const whale = fan.audience?.isWhaleOrVip || fan.tier === 'whale'
  const creator = fan.audience?.isCreatorLikely
  const platformLabel =
    fan.platform === 'onlyfans'
      ? t('platform.onlyfansAlt')
      : fan.platform === 'fansly'
        ? t('platform.fanslyAlt')
        : fan.platform.toUpperCase()
  const metaAccent = whale
    ? 'border-l-violet-500/50'
    : creator
      ? 'border-l-rose-500/35'
      : 'border-l-transparent'
  const memberSince = fanDisplayMemberSinceIso(fan)
  const periodEnd = fanDisplayPeriodEndIso(fan)

  return (
    <Card
      data-signal={whale ? 'whale' : creator ? 'creator' : 'default'}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-[border-color,box-shadow] duration-200',
        'shadow-none hover:border-border hover:shadow-sm',
        'border-l-[3px]',
        metaAccent,
      )}
    >
      <CardContent className="space-y-0 p-0">
        <div className="px-5 pb-5 pt-5">
          <div className="flex gap-4">
            <Avatar className="h-14 w-14 shrink-0 ring-1 ring-border/60">
              <AvatarImage src={proxyImageUrl(fan.avatar_url) || fan.avatar_url || undefined} alt="" />
              <AvatarFallback className="bg-muted text-[15px] font-medium text-muted-foreground">
                {(fan.display_name || fan.platform_username || '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-[17px] font-semibold leading-[1.2] tracking-tight text-foreground">
                    {fan.display_name || fan.platform_username || tg('unknownFan')}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">@{fan.platform_username || '—'}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full opacity-70 transition-opacity hover:opacity-100"
                      aria-label={tg('fanActionsAria')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/dashboard/messages?fanId=${encodeURIComponent(String(fan.platform_fan_id || fan.id))}&platform=${encodeURIComponent(fan.platform)}`}
                        className="flex items-center"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {tg('openMessages')}
                      </Link>
                    </DropdownMenuItem>
                    {fan.platform === 'onlyfans' && (fan.platform_fan_id || liveFilter) ? (
                      <DropdownMenuItem onClick={() => onOpenSummary(fan)}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {tg('aiSummary')}
                      </DropdownMenuItem>
                    ) : null}
                    {fan.platform === 'onlyfans' && (fan.audience?.isWhaleOrVip || fan.tier === 'whale') ? (
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/ai-studio/chatter?fanId=${encodeURIComponent(fan.id)}&profile=whale_whisper`}
                          className="flex items-center"
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          {tg('whaleWhisper')}
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {tg('sendMessage')}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Star className="mr-2 h-4 w-4" />
                      {fan.is_favorite ? tg('removeFavorite') : tg('addFavorite')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Ban className="mr-2 h-4 w-4" />
                      {tg('blockFan')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="mt-4 text-[12px] leading-snug text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 align-middle">
                  {fan.platform === 'onlyfans' ? (
                    <img
                      src={ONLYFANS_LOGO_SRC}
                      alt=""
                      className="inline h-[11px] w-auto max-w-[3.25rem] object-contain opacity-85"
                    />
                  ) : null}
                  {fan.platform === 'fansly' ? (
                    <img
                      src={FANSLY_LOGO_SRC}
                      alt=""
                      className="inline h-[11px] w-auto max-w-[2.75rem] object-contain opacity-85"
                    />
                  ) : null}
                  <span className="tabular-nums text-foreground/90">{platformLabel}</span>
                  <span aria-hidden className="select-none text-border">
                    ·
                  </span>
                  <span>{fanSubscriptionCommerceLine(fan)}</span>
                </span>
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 rounded-md border-border/70 px-2 py-0 text-[11px] font-medium capitalize tracking-tight text-foreground/90',
                    tierColors[fan.tier],
                  )}
                >
                  {fan.tier}
                </Badge>
                {fan.is_favorite ? (
                  <Star className="h-3.5 w-3.5 fill-amber-500/85 text-amber-500" aria-label={tg('favoriteStarAria')} />
                ) : null}
              </div>
            </div>
          </div>

          {fan.audience?.badges?.length ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {fan.audience.badges.map((b) => (
                <span
                  key={`${fan.id}-${b.key}`}
                  className={cn(
                    'rounded-md border border-border/55 bg-muted/25 px-2 py-0.5 text-[11px] font-medium text-muted-foreground',
                    b.className,
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}

          <dl className="mt-5 space-y-0 divide-y divide-border/35 border-t border-border/35 pt-1">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/85">
                {tg('memberSince')}
              </dt>
              <dd className="text-right text-[13px] font-medium tabular-nums tracking-tight text-foreground">
                {memberSince ? formatFanDateUtc(memberSince) : '—'}
              </dd>
            </div>
            {showSubscriptionEnd ? (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/85">
                  {tg('periodEnds')}
                </dt>
                <dd className="text-right text-[13px] font-medium tabular-nums tracking-tight text-foreground">
                  {periodEnd ? formatFanDateUtc(periodEnd) : '—'}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 py-3 last:border-b-0 last:pb-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/85">
                {tg('lastActive')}
              </dt>
              <dd className="text-right text-[13px] font-medium tabular-nums tracking-tight text-foreground">
                {fan.last_interaction ? formatFanDateUtc(fan.last_interaction) : '—'}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl bg-muted/25 px-4 py-3.5 transition-colors duration-200 group-hover:bg-muted/35">
            <div className="flex items-end justify-between gap-3">
              <span className="pb-0.5 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground/90">
                {tg('totalSpent')}
              </span>
              <span className="text-[22px] font-semibold tracking-tight tabular-nums text-foreground">
                {formatApiUsd(fan.total_spent, 0)}
              </span>
            </div>
            {hasSpendChannelsTracked(fan) ? (
              <div className="mt-4 border-t border-border/35 pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
                  {tg('revenueMix')}
                </p>
                <SpendMixBar fan={fan} />
              </div>
            ) : (
              <p className="mt-3 max-w-[32ch] text-[11px] leading-relaxed text-muted-foreground/95">
                {tg('breakdownHint')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function FansGallery({
  fans,
  filteredCountBeforeSearch = 0,
  searchMismatch = false,
  searchTerm = '',
  hasFanPlatformsConnected = false,
  hasOnlyFansConnected = false,
  hasFanslyConnected = false,
  platformScope = 'all',
  onEmptyQuickSync,
  emptyQuickSyncBusy = false,
  loading = false,
  liveFilter,
  showSubscriptionEnd = false,
}: FansGalleryProps) {
  const tg = useTranslations('fans.gallery')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryFanId, setSummaryFanId] = useState<string | null>(null)
  const [summaryLabel, setSummaryLabel] = useState('')

  const columns = useFansGalleryColumns()

  const openSummary = (fan: Fan) => {
    if (fan.platform !== 'onlyfans') return
    const id = fan.platform_fan_id || fan.id
    if (!id) return
    setSummaryFanId(id)
    setSummaryLabel(fan.display_name || fan.platform_username || id)
    setSummaryOpen(true)
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const rowChunks = useMemo(() => chunkFans(fans, columns), [fans, columns])

  const useVirtual = fans.length >= GALLERY_VIRTUAL_THRESHOLD

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? rowChunks.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => GALLERY_ROW_ESTIMATE_PX,
    overscan: 1,
  })

  const virtualItems = useVirtual ? rowVirtualizer.getVirtualItems() : []

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{tg('loading')}</p>
        </CardContent>
      </Card>
    )
  }

  if (fans.length === 0 && searchMismatch && searchTerm) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">{tg('noMatchesTitle')}</h3>
          <p className="mt-1 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {filteredCountBeforeSearch > 0 ? (
              <>
                {tg('noMatchesAmong', {
                  term: searchTerm,
                  count: filteredCountBeforeSearch.toLocaleString(),
                })}
              </>
            ) : (
              tg('noMatchesShort', { term: searchTerm })
            )}
          </p>
          <p className="mt-5 text-[13px] text-muted-foreground">{tg('noMatchesHint')}</p>
        </CardContent>
      </Card>
    )
  }

  if (fans.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="px-4 pb-10 pt-6 sm:px-6">
          {hasFanPlatformsConnected ? (
            <FansListEmptyConnected
              platformScope={platformScope}
              hasOnlyFansConnected={hasOnlyFansConnected}
              hasFanslyConnected={hasFanslyConnected}
              liveFilter={liveFilter}
              onQuickSync={onEmptyQuickSync}
              quickSyncBusy={emptyQuickSyncBusy}
            />
          ) : (
            <FansListEmptyDisconnected />
          )}
        </CardContent>
      </Card>
    )
  }

  const gridWrap = (
    <div
      className={cn(
        'grid gap-4',
        columns >= 3 && 'sm:grid-cols-2 xl:grid-cols-3',
        columns === 2 && 'sm:grid-cols-2',
        columns === 1 && 'grid-cols-1',
      )}
    >
      {fans.map((fan) => (
        <FansGalleryCard
          key={fan.id}
          fan={fan}
          liveFilter={liveFilter}
          showSubscriptionEnd={showSubscriptionEnd}
          onOpenSummary={openSummary}
        />
      ))}
    </div>
  )

  return (
    <>
      <FanAiSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        platformFanId={summaryFanId}
        fanLabel={summaryLabel}
      />
      {useVirtual ? (
        <div
          ref={scrollRef}
          className="max-h-[min(72vh,960px)] min-h-[300px] overflow-auto rounded-xl"
          role="region"
          aria-label={tg('regionAria')}
        >
          <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {virtualItems.map((vi) => {
              const slice = rowChunks[vi.index]
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full px-0"
                  style={{
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <div
                    className={cn(
                      'grid gap-4 pb-4',
                      columns >= 3 && 'sm:grid-cols-2 xl:grid-cols-3',
                      columns === 2 && 'sm:grid-cols-2',
                      columns === 1 && 'grid-cols-1',
                    )}
                  >
                    {slice.map((fan) => (
                      <FansGalleryCard
                        key={fan.id}
                        fan={fan}
                        liveFilter={liveFilter}
                        showSubscriptionEnd={showSubscriptionEnd}
                        onOpenSummary={openSummary}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        gridWrap
      )}
    </>
  )
}
