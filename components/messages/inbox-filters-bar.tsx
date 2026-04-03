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
    <div className={cn('flex flex-col gap-2 border-b border-border pb-2', className)}>
      <div className="flex flex-wrap gap-1">
        {SEGMENTS.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            variant={segment === id ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 rounded-full px-2.5 text-xs"
            onClick={() => onSegmentChange(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={platform} onValueChange={(v) => onPlatformChange(v as InboxPlatformFilter)}>
          <SelectTrigger className="h-8 w-[min(100%,9rem)] text-xs">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="onlyfans">OnlyFans</SelectItem>
            <SelectItem value="fansly">Fansly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => onSortChange(v as InboxSort)}>
          <SelectTrigger className="h-8 w-[min(100%,8.5rem)] text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="spend">Spend</SelectItem>
            <SelectItem value="unread">Unread first</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Tag / note…"
          className="h-8 min-w-[6rem] flex-1 text-xs"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
        />
      </div>
    </div>
  )
}
