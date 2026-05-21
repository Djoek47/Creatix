'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type RainbowSparklePillProps = {
  href: string
  /** Visible from `sm` and up; icon-only on narrow widths. */
  label: ReactNode
  title?: string
  'aria-label'?: string
  className?: string
}

/**
 * Canonical “rainbow ring + Sparkles + gradient label” pill used for high-intent CTAs
 * (e.g. Start trial, AI Studio tools). CSS: `.header-tools-rainbow-wrap` in `app/globals.css`.
 */
export function RainbowSparklePill({
  href,
  label,
  title,
  'aria-label': ariaLabel,
  className,
}: RainbowSparklePillProps) {
  return (
    <span className={cn('header-tools-rainbow-wrap inline-flex rounded-full shadow-sm', className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-9 shrink-0 gap-2 rounded-full border-0 bg-background/92 p-0 text-[13px] font-medium shadow-none ring-0 transition-colors duration-300 hover:bg-background dark:bg-card/88 dark:hover:bg-card/95 sm:h-9 sm:w-auto sm:min-w-[8.25rem] sm:px-3.5"
        asChild
        title={title}
      >
        <Link href={href} className="flex items-center justify-center gap-2" aria-label={ariaLabel}>
          <Sparkles
            className="h-4 w-4 shrink-0 text-amber-600 motion-safe:animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.45)] dark:text-amber-300"
            aria-hidden
          />
          <span className="hidden bg-gradient-to-r from-amber-600 via-fuchsia-600 to-violet-600 bg-clip-text text-[13px] font-semibold text-transparent sm:inline dark:from-amber-200 dark:via-fuchsia-300 dark:to-violet-300">
            {label}
          </span>
        </Link>
      </Button>
    </span>
  )
}
