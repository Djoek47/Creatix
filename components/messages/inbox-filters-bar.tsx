'use client'

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

const SEGMENTS: { id: InboxSegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'whales', label: 'Whales' },
  { id: 'creators', label: 'Creators' },
  { id: 'fans', label: 'Fans' },
]

type InboxFiltersBarProps = {
  segment: InboxSegment
  onSegmentChange: (s: InboxSegment) => void
  sort: InboxSort
  onSortChange: (s: InboxSort) => void
  platform: InboxPlatformFilter
  onPlatformChange: (p: InboxPlatformFilter) => void
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
  tag,
  onTagChange,
  className,
}: InboxFiltersBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border/60 pb-3', className)}>
      <div className="flex flex-wrap gap-1">
        {SEGMENTS.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            variant={segment === id ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 shrink-0 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium"
            onClick={() => onSegmentChange(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Select value={platform} onValueChange={(v) => onPlatformChange(v as InboxPlatformFilter)}>
          <SelectTrigger className="h-9 w-full min-w-0 rounded-xl text-xs">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="onlyfans">OnlyFans</SelectItem>
            <SelectItem value="fansly">Fansly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => onSortChange(v as InboxSort)}>
          <SelectTrigger className="h-9 w-full min-w-0 rounded-xl text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="spend">Spend</SelectItem>
            <SelectItem value="unread">Unread first</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Tag or note…"
          className="h-9 min-w-0 w-full rounded-xl text-xs"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
        />
      </div>
    </div>
  )
}
