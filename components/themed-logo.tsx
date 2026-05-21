'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ThemedLogoProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/**
 * Brand mark: soft wide aura (globals `.themed-logo-aura`) — gold in light, purple in dark,
 * with a thin accent of the other hue that breathes in the animation.
 */
export function ThemedLogo({ width = 40, height = 40, className, priority = false }: ThemedLogoProps) {
  return (
    <span className="themed-logo-aura inline-flex shrink-0 rounded-full align-middle">
      <Image
        src="/icon.png"
        alt="Circe et Venus"
        width={width}
        height={height}
        className={cn(
          'relative z-[1] rounded-full ring-1 ring-border/25 dark:ring-border/20',
          className,
        )}
        priority={priority}
      />
    </span>
  )
}
