'use client'

import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlatformWordmark } from '@/components/platform/platform-wordmark'
import { cn } from '@/lib/utils'

const ALLOWED = new Set(['onlyfans', 'fansly'])

const triggerLayout =
  'w-full min-w-[11rem] h-11 min-h-11 justify-between gap-2 rounded-xl border-border/50 bg-background/65 px-3 py-2 text-left shadow-sm transition-[border-color,box-shadow] hover:border-border/70 [&_[data-slot=select-value]]:min-h-10 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:!gap-3.5 [&_[data-slot=select-value]]:!overflow-visible [&_[data-slot=select-value]]:line-clamp-none'

/** Row shown in the closed trigger and in the list — Radix clones selected item markup into SelectValue only (no duplicate mark). */
function PlatformChoiceRow({
  platform,
  label,
  size,
}: {
  platform: 'onlyfans' | 'fansly'
  label: string
  size: 'lg' | 'md'
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <PlatformWordmark platform={platform} size={size === 'lg' ? 'lg' : 'md'} />
      <span
        className={cn(
          'min-w-0 truncate font-medium tracking-tight text-foreground',
          size === 'lg' ? 'text-[15px] leading-none' : 'text-[14px] leading-tight',
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function OfFanslyPlatformSelect({
  value,
  onValueChange,
  id,
  triggerClassName,
}: {
  value: string
  onValueChange: (v: string) => void
  id?: string
  triggerClassName?: string
}) {
  const normalized = ALLOWED.has(value) ? value : 'onlyfans'

  useEffect(() => {
    if (value === 'onlyfans' || value === 'fansly') return
    onValueChange('onlyfans')
  }, [value, onValueChange])

  return (
    <Select value={normalized} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={cn(triggerLayout, triggerClassName)}>
        {/* Single lockup comes from SelectItem markup — never add a second logo here */}
        <SelectValue placeholder="Platform" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/45">
        <SelectItem value="onlyfans" textValue="OnlyFans" className="cursor-pointer rounded-lg py-2.5">
          <PlatformChoiceRow platform="onlyfans" label="OnlyFans" size="lg" />
        </SelectItem>
        <SelectItem value="fansly" textValue="Fansly" className="cursor-pointer rounded-lg py-2.5">
          <PlatformChoiceRow platform="fansly" label="Fansly" size="lg" />
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
