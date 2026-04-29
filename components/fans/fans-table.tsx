'use client'

import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Card, CardContent } from '@/components/ui/card'

import { formatFanCurrency, formatFanDateUtc } from '@/lib/fans/crm-format'
import { fanDisplayPeriodEndIso } from '@/lib/fans/fan-display-dates'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
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
import { FansListEmptyConnected, FansListEmptyDisconnected, type FansListPlatformScope } from '@/components/fans/fans-list-empty'

const SELECT_ALL_CAP = 2500
const ROW_ESTIMATE_PX = 64

interface FansTableProps {
  fans: Fan[]
  /** Row count after audience/platform filters, before search — for empty search messaging. */
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
  /** Show subscription period end when synced (database / expiring-soon views). */
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

function FansTableFanRow({
  fan,
  checked,
  onToggleChecked,
  showSubscriptionEnd,
  liveFilter,
  onOpenSummary,
}: {
  fan: Fan
  checked: boolean
  onToggleChecked: () => void
  showSubscriptionEnd: boolean
  liveFilter: FansTableProps['liveFilter']
  onOpenSummary: (fan: Fan) => void
}) {
  const periodEnd = fanDisplayPeriodEndIso(fan)
  return (
    <TableRow className="border-border hover:bg-muted/25">
      <TableCell className="w-12">
        <Checkbox checked={checked} onCheckedChange={onToggleChecked} />
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
            <p className="truncate font-medium">{fan.display_name || fan.platform_username || 'Unknown'}</p>
            <p className="truncate text-xs text-muted-foreground">@{fan.platform_username || '—'}</p>
          </div>
          {fan.is_favorite ? <Star className="h-4 w-4 shrink-0 fill-chart-4 text-chart-4" /> : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {fan.platform === 'onlyfans' ? (
            <img src={ONLYFANS_LOGO_SRC} alt="" className="h-4 max-w-[3.75rem] object-contain object-left" />
          ) : null}
          {fan.platform === 'fansly' ? (
            <img src={FANSLY_LOGO_SRC} alt="" className="h-4 max-w-[3.25rem] object-contain object-left" />
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              platformColors[fan.platform as keyof typeof platformColors] || 'bg-muted text-muted-foreground',
            )}
          >
            {fan.platform === 'onlyfans'
              ? 'OnlyFans'
              : fan.platform === 'fansly'
                ? 'Fansly'
                : fan.platform.toUpperCase()}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex max-w-[200px] flex-wrap gap-1">
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
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-xs capitalize', tierColors[fan.tier])}>
          {fan.tier}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-medium">${formatFanCurrency(fan.total_spent)}</TableCell>
      {showSubscriptionEnd ? (
        <TableCell className="text-muted-foreground text-xs">
          {periodEnd ? formatFanDateUtc(periodEnd) : '—'}
        </TableCell>
      ) : null}
      <TableCell className="text-muted-foreground">
        {fan.last_interaction ? formatFanDateUtc(fan.last_interaction) : '—'}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
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
            {fan.platform === 'onlyfans' && (fan.platform_fan_id || liveFilter) ? (
              <DropdownMenuItem onClick={() => onOpenSummary(fan)}>
                <Sparkles className="mr-2 h-4 w-4" />
                AI fan summary
              </DropdownMenuItem>
            ) : null}
            {fan.platform === 'onlyfans' && (fan.audience?.isWhaleOrVip || fan.tier === 'whale') ? (
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/ai-studio/chatter?fanId=${encodeURIComponent(fan.id)}&profile=whale_whisper`}
                  className="flex items-center"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Whale whisper
                </Link>
              </DropdownMenuItem>
            ) : null}
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
  )
}

export function FansTable({
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
}: FansTableProps) {
  const [selectedFans, setSelectedFans] = useState<string[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryFanId, setSummaryFanId] = useState<string | null>(null)
  const [summaryLabel, setSummaryLabel] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  const colCount = showSubscriptionEnd ? 9 : 8

  const rowVirtualizer = useVirtualizer({
    count: fans.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 12,
  })

  const virtualItems = fans.length ? rowVirtualizer.getVirtualItems() : []
  const paddingTop = virtualItems.length ? virtualItems[0].start : 0
  const paddingBottom = virtualItems.length
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0

  const selectableIds = useMemo(() => fans.slice(0, SELECT_ALL_CAP).map((f) => f.id), [fans])

  const selectedSet = useMemo(() => new Set(selectedFans), [selectedFans])
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id))
  const someSelected =
    selectableIds.some((id) => selectedSet.has(id)) && !allSelected

  const toggleFan = (fanId: string) => {
    setSelectedFans((prev) =>
      prev.includes(fanId) ? prev.filter((id) => id !== fanId) : [...prev, fanId],
    )
  }

  const toggleAll = () => {
    if (selectableIds.length === 0) {
      setSelectedFans([])
      return
    }
    const allHighlighted =
      selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id))
    setSelectedFans(allHighlighted ? [] : [...selectableIds])
  }

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

  if (fans.length === 0 && searchMismatch && searchTerm) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">No matches</h3>
          <p className="mt-1 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Nothing matches <span className="text-foreground/90">{searchTerm}</span>
            {filteredCountBeforeSearch > 0
              ? ` among ${filteredCountBeforeSearch.toLocaleString()} fans in this view.`
              : '.'}
          </p>
          <p className="mt-5 text-[13px] text-muted-foreground">
            Clear the search bar or widen your audience filters.
          </p>
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

  return (
    <Card className="border-border bg-card">
      <FanAiSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        platformFanId={summaryFanId}
        fanLabel={summaryLabel}
      />
      {fans.length > SELECT_ALL_CAP ? (
        <p className="border-b border-border/80 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Bulk actions apply to the first {SELECT_ALL_CAP.toLocaleString()} rows in this view. Use search and filters
          to narrow the list first.
        </p>
      ) : null}
      <CardContent className="p-0">
        <div ref={scrollRef} className="max-h-[min(72vh,880px)] min-h-[280px] overflow-auto rounded-b-xl">
          <Table className="relative min-w-[640px]">
            <TableHeader className="sticky top-0 z-[2] bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    title={
                      selectableIds.length < fans.length ? `Select first ${SELECT_ALL_CAP.toLocaleString()}` : 'Select all in view'
                    }
                  />
                </TableHead>
                <TableHead>Fan</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                {showSubscriptionEnd ? <TableHead>Period ends</TableHead> : null}
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paddingTop > 0 ? (
                <TableRow aria-hidden className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="border-0 p-0" style={{ height: paddingTop }} />
                </TableRow>
              ) : null}
              {virtualItems.map((vi) => {
                const fan = fans[vi.index]
                return (
                  <FansTableFanRow
                    key={fan.id}
                    fan={fan}
                    checked={selectedFans.includes(fan.id)}
                    onToggleChecked={() => toggleFan(fan.id)}
                    showSubscriptionEnd={showSubscriptionEnd}
                    liveFilter={liveFilter}
                    onOpenSummary={openSummary}
                  />
                )
              })}
              {paddingBottom > 0 ? (
                <TableRow aria-hidden className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="border-0 p-0" style={{ height: paddingBottom }} />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
