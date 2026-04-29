'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ALLOWED = new Set(['onlyfans', 'fansly'])

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

  const logoSrc = normalized === 'onlyfans' ? ONLYFANS_LOGO_SRC : FANSLY_LOGO_SRC

  return (
    <Select value={normalized} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn('w-full min-w-[11rem] justify-between gap-2', triggerClassName)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Image
            src={logoSrc}
            alt=""
            width={88}
            height={28}
            className="h-5 w-auto max-w-[48%] shrink-0 object-contain opacity-95 dark:opacity-100"
          />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="onlyfans" textValue="OnlyFans" className="cursor-pointer">
          <span className="flex items-center gap-2 py-0.5">
            <Image
              src={ONLYFANS_LOGO_SRC}
              alt=""
              width={88}
              height={28}
              className="h-5 w-auto max-w-[44%] shrink-0 object-contain"
            />
            <span>OnlyFans</span>
          </span>
        </SelectItem>
        <SelectItem value="fansly" textValue="Fansly" className="cursor-pointer">
          <span className="flex items-center gap-2 py-0.5">
            <Image
              src={FANSLY_LOGO_SRC}
              alt=""
              width={88}
              height={28}
              className="h-5 w-auto max-w-[44%] shrink-0 object-contain"
            />
            <span>Fansly</span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
