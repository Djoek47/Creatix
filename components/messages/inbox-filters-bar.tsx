'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { InboxSegment, InboxSort, InboxPlatformFilter } from '@/lib/messages/inbox-crm'

const SEGMENT_IDS: { id: InboxSegment; labelKey: 'segmentAll' | 'segmentUnread' | 'segmentWhales' | 'segmentCreators' | 'segmentFans' }[] = [
  { id: 'all', labelKey: 'segmentAll' },
  { id: 'unread', labelKey: 'segmentUnread' },
  { id: 'whales', labelKey: 'segmentWhales' },
  { id: 'creators', labelKey: 'segmentCreators' },
  { id: 'fans', labelKey: 'segmentFans' },
]

const DEFAULT_PLATFORM_OPTIONS: InboxPlatformFilter[] = ['all', 'onlyfans', 'fansly']

type InboxFiltersBarProps = {
  segment: InboxSegment
  onSegmentChange: (s: InboxSegment) => void
  sort: InboxSort
  onSortChange: (s: InboxSort) => void
  platform: InboxPlatformFilter
  onPlatformChange: (p: InboxPlatformFilter) => void
  /** From billing Focus vs Unified — hides disallowed platform rows. */
  platformOptions?: InboxPlatformFilter[]
  tag: string
  onTagChange: (t: string) => void
  className?: string
}

export function InboxFiltersBar({
  segment,
  onSegmentChange,
  sort,
  onSortChange,
  platform,
  onPlatformChange,
  platformOptions = DEFAULT_PLATFORM_OPTIONS,
  tag,
  onTagChange,
  className,
}: InboxFiltersBarProps) {
  const t = useTranslations('messages.inbox')
  const opts = platformOptions.length > 0 ? platformOptions : DEFAULT_PLATFORM_OPTIONS

  const filterSelectTrigger = cn(
    'h-10 w-full min-w-0 rounded-2xl border-zinc-200/70 bg-white/75 text-[13px] font-medium tracking-[-0.01em] text-foreground shadow-none transition-[border-color,background-color] dark:border-white/[0.08] dark:bg-zinc-950/45',
    'hover:bg-white/90 dark:hover:bg-zinc-950/55',
    'focus-visible:ring-2 focus-visible:ring-zinc-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-white/15',
  )

  return (
    <div className={cn('flex flex-col gap-4 border-b border-border/40 pb-4', className)}>
      <div className="flex flex-wrap gap-1">
        {SEGMENT_IDS.map(({ id, labelKey }) => (
          <Button
            key={id}
            type="button"
            variant={segment === id ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[12px] font-medium tracking-[-0.01em]',
              segment === id
                ? 'bg-foreground/[0.06] text-foreground shadow-none dark:bg-white/[0.08]'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            )}
            onClick={() => onSegmentChange(id)}
          >
            {t(labelKey)}
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <Select value={platform} onValueChange={(v) => onPlatformChange(v as InboxPlatformFilter)}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue placeholder={t('platformPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50 p-1 shadow-lg dark:border-white/[0.08]">
            {opts.includes('all') ? (
              <SelectItem value="all" className="rounded-xl py-2.5 text-[13px]">
                {t('allPlatforms')}
              </SelectItem>
            ) : null}
            {opts.includes('onlyfans') ? (
              <SelectItem value="onlyfans" className="rounded-xl py-2.5 text-[13px]">
                {t('platformOnlyfans')}
              </SelectItem>
            ) : null}
            {opts.includes('fansly') ? (
              <SelectItem value="fansly" className="rounded-xl py-2.5 text-[13px]">
                {t('platformFansly')}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => onSortChange(v as InboxSort)}>
          <SelectTrigger className={filterSelectTrigger}>
            <SelectValue placeholder={t('sortPlaceholder')} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50 p-1 shadow-lg dark:border-white/[0.08]">
            <SelectItem value="recent" className="rounded-xl py-2.5 text-[13px]">
              {t('sortRecent')}
            </SelectItem>
            <SelectItem value="spend" className="rounded-xl py-2.5 text-[13px]">
              {t('sortSpend')}
            </SelectItem>
            <SelectItem value="unread" className="rounded-xl py-2.5 text-[13px]">
              {t('sortUnreadFirst')}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={t('tagPlaceholder')}
          className={cn(
            filterSelectTrigger,
            'px-3.5 placeholder:text-muted-foreground/55',
          )}
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
        />
      </div>
    </div>
  )
}
