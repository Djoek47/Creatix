'use client'

import Image from 'next/image'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { cn } from '@/lib/utils'

export type PlatformLogoChipPlatform = 'onlyfans' | 'fansly'

type PlatformLogoChipProps = {
  platform: PlatformLogoChipPlatform
  className?: string
  /** Visual scale — drawer/modal share defaults */
  size?: 'sm' | 'md'
}

export function PlatformLogoChip({ platform, className, size = 'md' }: PlatformLogoChipProps) {
  const src = platform === 'onlyfans' ? ONLYFANS_LOGO_SRC : FANSLY_LOGO_SRC
  const label = platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'
  const heightPx = size === 'sm' ? 14 : 18
  const widthPx = platform === 'onlyfans' ? 72 : 64

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border/35 bg-background/35 px-2 py-0.5',
        className,
      )}
      title={label}
    >
      <Image
        src={src}
        alt=""
        width={widthPx}
        height={heightPx}
        className={cn(
          'w-auto object-contain object-left',
          size === 'sm' && 'h-3.5 max-w-[3.25rem]',
          size === 'md' && 'h-[18px] max-w-[4.25rem]',
        )}
      />
    </span>
  )
}
