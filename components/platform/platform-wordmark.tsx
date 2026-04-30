'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC, MANYVIDS_LOGO_SRC } from '@/lib/platform-logos'

const SIZE = {
  /** Chips beside toggles — minimal footprint */
  xs: 'h-3 max-h-3 w-auto max-w-[2.375rem]',
  /** Tab chips, dense tables */
  sm: 'h-5 max-h-5 w-auto max-w-[4rem]',
  /** Dropdown rows inside menus */
  md: 'h-8 max-h-8 w-auto max-w-[7.25rem]',
  /** Primary selectors (toolbar, tool forms) — one clear lockup next to label */
  lg: 'h-9 max-h-9 w-auto max-w-[8.75rem] sm:h-10 sm:max-h-10 sm:max-w-[9.5rem]',
} as const

export type PlatformWordmarkSize = keyof typeof SIZE

type Platform = 'onlyfans' | 'fansly' | 'manyvids'

const dims: Record<
  Platform,
  { w: number; h: number; sizes: string }
> = {
  onlyfans: { w: 152, h: 48, sizes: '(max-width: 640px) 120px, 152px' },
  fansly: { w: 128, h: 40, sizes: '(max-width: 640px) 100px, 128px' },
  manyvids: { w: 48, h: 48, sizes: '48px' },
}

/**
 * Official platform marks from `/public`.
 */
export function PlatformWordmark({
  platform,
  size = 'md',
  className,
}: {
  platform: Platform
  size?: PlatformWordmarkSize
  className?: string
}) {
  const src =
    platform === 'onlyfans'
      ? ONLYFANS_LOGO_SRC
      : platform === 'fansly'
        ? FANSLY_LOGO_SRC
        : MANYVIDS_LOGO_SRC
  const d = dims[platform]

  return (
    <Image
      src={src}
      alt=""
      width={d.w}
      height={d.h}
      sizes={d.sizes}
      className={cn(
        'shrink-0 object-contain object-left opacity-[0.96] dark:opacity-100',
        SIZE[size],
        className,
      )}
      priority={false}
    />
  )
}
