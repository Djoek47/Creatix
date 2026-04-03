'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'

import { formatFanCurrency, formatFanDateUtc } from '@/lib/fans/crm-format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal, MessageSquare, Star, Ban, Eye, Loader2, Sparkles, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { Fan } from '@/lib/types'
import Link from 'next/link'
import { FanAiSummaryDialog } from '@/components/fans/fan-ai-summary-dialog'
import {
  FanProfileTypeSelect,
  type AudienceProfileValue,
} from '@/components/fans/fan-profile-type-select'

interface FansTableProps {
  fans: Fan[]
  hasFanPlatformsConnected?: boolean
  loading?: boolean
  liveFilter?: 'active' | 'expired' | 'latest' | 'top'
  /** Show subscription period end when synced (database / expiring-soon views). */
  showSubscriptionEnd?: boolean
  /** Override CRM profile type (whale / creator / fan); complements auto classification. */
  onAudienceProfileChange?: (fanId: string, value: AudienceProfileValue) => void | Promise<void>
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

export function FansTable({
  fans,
  hasFanPlatformsConnected = false,
  loading = false,
  liveFilter,
  showSubscriptionEnd = false,
  onAudienceProfileChange,
}: FansTableProps) {
  const [selectedFans, setSelectedFans] = useState<string[]>([])
  const [profilePendingId, setProfilePendingId] = useState<string | null>(null)

  const handleProfileChange = useCallback(
    async (fanId: string, value: AudienceProfileValue) => {
      if (!onAudienceProfileChange) return
      setProfilePendingId(fanId)
      try {
        await onAudienceProfileChange(fanId, value)
      } finally {
        setProfilePendingId(null)
      }
    },
    [onAudienceProfileChange],
  )
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryFanId, setSummaryFanId] = useState<string | null>(null)
  const [summaryLabel, setSummaryLabel] = useState('')

  const toggleFan = (fanId: string) => {
    setSelectedFans(prev =>
      prev.includes(fanId)
        ? prev.filter(id => id !== fanId)
        : [...prev, fanId]
    )
  }

  const toggleAll = () => {
    setSelectedFans(prev =>
      prev.length === fans.length ? [] : fans.map(f => f.id)
    )
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">{liveFilter ? 'No fans in this live view' : 'No Fans Yet'}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasFanPlatformsConnected
              ? liveFilter
                ? 'The live OnlyFans list can be empty for this filter. Choose “From database” in the filter menu to see synced fans, or open Sync → Quick sync to pull from the platform.'
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

  const openSummary = (fan: Fan) => {
    if (fan.platform !== 'onlyfans') return
    const id = fan.platform_fan_id || fan.id
    if (!id) return
    setSummaryFanId(id)
    setSummaryLabel(fan.display_name || fan.platform_username || id)
    setSummaryOpen(true)
  }

  return (
    <Card className="border-border bg-card">
      <FanAiSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        platformFanId={summaryFanId}
        fanLabel={summaryLabel}
      />
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedFans.length === fans.length && fans.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Fan</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead className="min-w-[200px]">Classification</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              {showSubscriptionEnd ? <TableHead>Period ends</TableHead> : null}
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fans.map((fan) => (
              <TableRow key={fan.id} className="border-border">
                <TableCell>
                  <Checkbox
                    checked={selectedFans.includes(fan.id)}
                    onCheckedChange={() => toggleFan(fan.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-border">
                      <AvatarImage
                        src={proxyImageUrl(fan.avatar_url) || fan.avatar_url || undefined}
                        alt=""
                      />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {(fan.display_name || fan.platform_username || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{fan.display_name || fan.platform_username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">@{fan.platform_username || '—'}</p>
                    </div>
                    {fan.is_favorite && (
                      <Star className="h-4 w-4 shrink-0 fill-chart-4 text-chart-4" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {fan.platform === 'onlyfans' && (
                      <img src="/onlyfans-logo.png" alt="" className="h-4 w-4 object-contain" />
                    )}
                    {fan.platform === 'fansly' && (
                      <img src="/fansly-logo.png" alt="" className="h-4 w-4 object-contain" />
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        platformColors[fan.platform as keyof typeof platformColors] || 'bg-muted text-muted-foreground',
                      )}
                    >
                      {fan.platform === 'onlyfans' ? 'OnlyFans' : fan.platform === 'fansly' ? 'Fansly' : fan.platform.toUpperCase()}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[240px] flex-col gap-1.5">
                    <div className="flex flex-wrap gap-1">
                      {fan.audience?.badges?.length ? (
                        fan.audience.badges.map((b) => (
                          <Badge
                            key={`${fan.id}-${b.key}`}
                            variant="outline"
                            className={cn('whitespace-nowrap text-[10px] font-medium', b.className)}
                          >
                            {b.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    {onAudienceProfileChange ? (
                      <FanProfileTypeSelect
                        value={(fan.audience_profile_override ?? 'auto') as AudienceProfileValue}
                        disabled={profilePendingId === fan.id}
                        onChange={(v) => void handleProfileChange(fan.id, v)}
                        className="w-full min-w-[180px]"
                      />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs capitalize', tierColors[fan.tier])}>
                    {fan.tier}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${formatFanCurrency(fan.total_spent)}
                </TableCell>
                {showSubscriptionEnd ? (
                  <TableCell className="text-muted-foreground text-xs">
                    {fan.subscription_expires_at
                      ? formatFanDateUtc(fan.subscription_expires_at)
                      : '—'}
                  </TableCell>
                ) : null}
                <TableCell className="text-muted-foreground">
                  {fan.last_interaction ? formatFanDateUtc(fan.last_interaction) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
