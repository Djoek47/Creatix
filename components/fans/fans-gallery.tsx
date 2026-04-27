'use client'

import { useState } from 'react'
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
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { Fan } from '@/lib/types'
import Link from 'next/link'
import { FanAiSummaryDialog } from '@/components/fans/fan-ai-summary-dialog'
import { formatFanCurrency, formatFanDateUtc } from '@/lib/fans/crm-format'

interface FansGalleryProps {
  fans: Fan[]
  hasFanPlatformsConnected?: boolean
  loading?: boolean
  liveFilter?: 'active' | 'expired' | 'latest' | 'top'
  showSubscriptionEnd?: boolean
}

const tierColors = {
  whale: 'bg-primary/20 text-primary border-primary/30',
  regular: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  new: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  inactive: 'bg-muted text-muted-foreground border-border',
}

const platformColors = {
  onlyfans: 'bg-[#00AFF0]/20 text-[#00AFF0]',
  mym: 'bg-[#FF4D67]/20 text-[#FF4D67]',
  fansly: 'bg-[#009FFF]/20 text-[#009FFF]',
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
  const { sub, tips, dms, feed } = spendSegments(fan)
  const sum = sub + tips + dms + feed
  if (sum <= 0) {
    return <p className="text-[11px] text-muted-foreground">Tracked categories sum to $0 so far.</p>
  }
  const pct = (n: number) => `${Math.max(2, (n / sum) * 100)}%`
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {sub > 0 ? (
          <div
            className="bg-chart-2 h-full min-w-[4px] transition-all"
            style={{ width: pct(sub) }}
            title={`Subscription $${formatFanCurrency(sub)}`}
          />
        ) : null}
        {tips > 0 ? (
          <div
            className="h-full min-w-[4px] bg-amber-500/80 transition-all"
            style={{ width: pct(tips) }}
            title={`Tips $${formatFanCurrency(tips)}`}
          />
        ) : null}
        {dms > 0 ? (
          <div
            className="h-full min-w-[4px] bg-violet-500/75 transition-all"
            style={{ width: pct(dms) }}
            title={`DMs / chat PPV $${formatFanCurrency(dms)}`}
          />
        ) : null}
        {feed > 0 ? (
          <div
            className="h-full min-w-[4px] bg-teal-500/75 transition-all"
            style={{ width: pct(feed) }}
            title={`Feed PPV $${formatFanCurrency(feed)}`}
          />
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground sm:grid-cols-4">
        <li>
          <span className="text-chart-2">Sub</span> ${formatFanCurrency(sub)}
        </li>
        <li>
          <span className="text-amber-600 dark:text-amber-400">Tips</span> ${formatFanCurrency(tips)}
        </li>
        <li>
          <span className="text-violet-600 dark:text-violet-400">DMs</span> ${formatFanCurrency(dms)}
        </li>
        <li>
          <span className="text-teal-600 dark:text-teal-400">Feed</span> ${formatFanCurrency(feed)}
        </li>
      </ul>
    </div>
  )
}

function commerceBadge(fan: Fan) {
  const t = fan.subscription_account_type
  if (t === 'free') {
    return (
      <Badge variant="outline" className="border-border text-[10px]">
        Free follow
      </Badge>
    )
  }
  if (t === 'paid') {
    return (
      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-200">
        Paid sub
        {fan.subscription_price != null && fan.subscription_price > 0
          ? ` · $${formatFanCurrency(fan.subscription_price)}`
          : ''}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      Tier unknown
    </Badge>
  )
}

export function FansGallery({
  fans,
  hasFanPlatformsConnected = false,
  loading = false,
  liveFilter,
  showSubscriptionEnd = false,
}: FansGalleryProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryFanId, setSummaryFanId] = useState<string | null>(null)
  const [summaryLabel, setSummaryLabel] = useState('')

  const openSummary = (fan: Fan) => {
    if (fan.platform !== 'onlyfans') return
    const id = fan.platform_fan_id || fan.id
    if (!id) return
    setSummaryFanId(id)
    setSummaryLabel(fan.display_name || fan.platform_username || id)
    setSummaryOpen(true)
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading fans…</p>
        </CardContent>
      </Card>
    )
  }

  if (fans.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium">{liveFilter ? 'No fans in this live view' : 'No Fans Yet'}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasFanPlatformsConnected
              ? liveFilter
                ? 'The live OnlyFans list can be empty if the partner returns no rows for this filter, or your session needs a refresh. Open the filter menu and choose “From database” to see fans already synced to Circe, or use Sync → Quick sync.'
                : 'OnlyFans or Fansly is connected. Use Sync above (Quick or Full CRM update), or fans appear as subscribers and tips come in.'
              : 'Connect OnlyFans or Fansly in Settings to import your fans and start managing your community.'}
          </p>
          {!hasFanPlatformsConnected && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/settings?tab=integrations">Go to Settings → Integrations</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <FanAiSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        platformFanId={summaryFanId}
        fanLabel={summaryLabel}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fans.map((fan) => {
          const whale = fan.audience?.isWhaleOrVip || fan.tier === 'whale'
          const creator = fan.audience?.isCreatorLikely
          return (
            <Card
              key={fan.id}
              className={cn(
                'border-border bg-card overflow-hidden transition-shadow hover:shadow-md',
                whale && 'ring-1 ring-violet-500/35',
                creator && 'ring-1 ring-red-500/25',
              )}
            >
              <div
                className={cn(
                  'h-1 w-full',
                  whale && 'bg-gradient-to-r from-violet-600/80 via-fuchsia-500/60 to-transparent',
                  !whale && creator && 'bg-gradient-to-r from-red-600/70 via-rose-500/50 to-transparent',
                )}
              />
              <CardContent className="space-y-3 p-4 pt-3">
                <div className="flex gap-3">
                  <Avatar className="h-16 w-16 shrink-0 border-2 border-border">
                    <AvatarImage
                      src={proxyImageUrl(fan.avatar_url) || fan.avatar_url || undefined}
                      alt=""
                    />
                    <AvatarFallback className="bg-secondary text-lg text-secondary-foreground">
                      {(fan.display_name || fan.platform_username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-tight">
                          {fan.display_name || fan.platform_username || 'Unknown'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">@{fan.platform_username || '—'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                              Open in Messages
                            </Link>
                          </DropdownMenuItem>
                          {fan.platform === 'onlyfans' && (fan.platform_fan_id || liveFilter) && (
                            <DropdownMenuItem onClick={() => openSummary(fan)}>
                              <Sparkles className="mr-2 h-4 w-4" />
                              AI fan summary
                            </DropdownMenuItem>
                          )}
                          {fan.platform === 'onlyfans' &&
                            (fan.audience?.isWhaleOrVip || fan.tier === 'whale') && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/ai-studio/chatter?fanId=${encodeURIComponent(fan.id)}&profile=whale_whisper`}
                                  className="flex items-center"
                                >
                                  <Crown className="mr-2 h-4 w-4" />
                                  Whale whisper
                                </Link>
                              </DropdownMenuItem>
                            )}
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Star className="mr-2 h-4 w-4" />
                            {fan.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            Block Fan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {fan.platform === 'onlyfans' && (
                        <img src="/onlyfans-logo.png" alt="" className="h-3.5 w-3.5 object-contain opacity-90" />
                      )}
                      {fan.platform === 'fansly' && (
                        <img src="/fansly-logo.png" alt="" className="h-3.5 w-3.5 object-contain opacity-90" />
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          platformColors[fan.platform as keyof typeof platformColors] ||
                            'bg-muted text-muted-foreground',
                        )}
                      >
                        {fan.platform === 'onlyfans'
                          ? 'OnlyFans'
                          : fan.platform === 'fansly'
                            ? 'Fansly'
                            : fan.platform.toUpperCase()}
                      </Badge>
                      {commerceBadge(fan)}
                      <Badge variant="outline" className={cn('text-[10px] capitalize', tierColors[fan.tier])}>
                        {fan.tier}
                      </Badge>
                      {fan.is_favorite && <Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" />}
                    </div>
                  </div>
                </div>

                {fan.audience?.badges?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {fan.audience.badges.map((b) => (
                      <Badge
                        key={`${fan.id}-${b.key}`}
                        variant="outline"
                        className={cn('text-[10px] font-medium', b.className)}
                      >
                        {b.label}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Member since</dt>
                    <dd className="font-medium">
                      {fan.subscription_start ? formatFanDateUtc(fan.subscription_start) : '—'}
                    </dd>
                  </div>
                  {showSubscriptionEnd ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Period ends</dt>
                      <dd className="font-medium">
                        {fan.subscription_expires_at ? formatFanDateUtc(fan.subscription_expires_at) : '—'}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Last active</dt>
                    <dd className="font-medium">
                      {fan.last_interaction ? formatFanDateUtc(fan.last_interaction) : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Total spent</span>
                    <span className="text-lg font-semibold tabular-nums">${formatFanCurrency(fan.total_spent)}</span>
                  </div>
                  {hasSpendChannelsTracked(fan) ? (
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Revenue mix
                      </p>
                      <SpendMixBar fan={fan} />
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                      Category breakdown appears as new tips, renewals, and purchases show up from your connected
                      platforms.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
