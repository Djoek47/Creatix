'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
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
  'w-full min-w-[11rem] h-11 min-h-11 justify-between gap-2 rounded-2xl border-zinc-200/70 bg-white/75 px-3.5 py-2 text-left text-[13px] font-medium tracking-[-0.01em] shadow-none transition-[border-color,background-color] hover:bg-white/90 dark:border-white/[0.08] dark:bg-zinc-950/45 dark:hover:bg-zinc-950/55 [&_[data-slot=select-value]]:min-h-10 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:!gap-3.5 [&_[data-slot=select-value]]:!overflow-visible [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:text-foreground'

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
  allowedAdultPlatforms,
}: {
  value: string
  onValueChange: (v: string) => void
  id?: string
  triggerClassName?: string
  /** Paid Focus: pass `['onlyfans']` or `['fansly']` to hide the other platform. */
  allowedAdultPlatforms?: ('onlyfans' | 'fansly')[]
}) {
  const tInbox = useTranslations('inbox')

  const allowedSet = useMemo(() => {
    if (allowedAdultPlatforms?.length) {
      const s = new Set(allowedAdultPlatforms.filter((p) => ALLOWED.has(p)))
      if (s.size > 0) return s as Set<'onlyfans' | 'fansly'>
    }
    return new Set<'onlyfans' | 'fansly'>(['onlyfans', 'fansly'])
  }, [allowedAdultPlatforms])

  const firstAllowed: 'onlyfans' | 'fansly' = allowedSet.has('onlyfans') ? 'onlyfans' : 'fansly'
  const normalized = allowedSet.has(value as 'onlyfans' | 'fansly')
    ? (value as 'onlyfans' | 'fansly')
    : firstAllowed

  useEffect(() => {
    if (allowedSet.has(value as 'onlyfans' | 'fansly')) return
    onValueChange(firstAllowed)
  }, [value, onValueChange, firstAllowed, allowedSet])

  return (
    <Select value={normalized} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn(
          triggerLayout,
          'focus-visible:ring-2 focus-visible:ring-zinc-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-white/15',
          triggerClassName,
        )}
      >
        {/* Single lockup comes from SelectItem markup — never add a second logo here */}
        <SelectValue placeholder={tInbox('platformPlaceholder')} />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-border/50 p-1 shadow-lg dark:border-white/[0.08]">
        {allowedSet.has('onlyfans') ? (
          <SelectItem
            value="onlyfans"
            textValue="OnlyFans"
            className="cursor-pointer rounded-xl py-2.5 text-[13px]"
          >
            <PlatformChoiceRow platform="onlyfans" label="OnlyFans" size="lg" />
          </SelectItem>
        ) : null}
        {allowedSet.has('fansly') ? (
          <SelectItem
            value="fansly"
            textValue="Fansly"
            className="cursor-pointer rounded-xl py-2.5 text-[13px]"
          >
            <PlatformChoiceRow platform="fansly" label="Fansly" size="lg" />
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  )
}
