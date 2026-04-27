'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ThemedLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/** Shared rim + glow: gold in light mode, purple in dark (all uses of `/icon.png` brand mark). */
const themedLogoRim = cn(
  'relative rounded-full transition-shadow duration-300',
  'ring-2 ring-amber-400/45 ring-offset-2 ring-offset-background',
  'shadow-[0_0_14px_-2px_rgba(234,179,8,0.55),0_0_32px_-8px_rgba(212,175,55,0.42),0_0_48px_-14px_rgba(251,191,36,0.2)]',
  'dark:ring-fuchsia-500/50',
  'dark:shadow-[0_0_16px_-2px_rgba(168,85,247,0.75),0_0_38px_-10px_rgba(139,92,246,0.55),0_0_52px_-16px_rgba(124,58,237,0.35)]',
)

export function ThemedLogo({ width = 40, height = 40, className, priority = false }: ThemedLogoProps) {
  return (
    <Image
      src="/icon.png"
      alt="Circe et Venus"
      width={width}
      height={height}
      className={cn(themedLogoRim, className)}
      priority={priority}
    />
  )
}
