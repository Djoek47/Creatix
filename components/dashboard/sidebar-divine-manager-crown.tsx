'use client'

import { useId } from 'react'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  /** Sidebar row icon sizing (e.g. `h-4 w-4` / cozy box). */
  iconBoxClass: string
  className?: string
  /** Optional motion class on the SVG (desktop passes `navEase`). */
  navEase?: string
}

/**
 * Crown for Divine Manager nav: same gold gradient language as `.sidebar-divine-manager-text`
 * (stroke = `url(#…)` over defs; hues from CSS vars on `.sidebar-divine-manager-crown`).
 */
export function SidebarDivineManagerCrown({ iconBoxClass, className, navEase }: Props) {
  const gradId = `dm-crown-grad-${useId().replace(/:/g, '')}`

  return (
    <Crown
      aria-hidden
      className={cn(
        'relative z-[1] flex-shrink-0 sidebar-divine-manager-crown',
        navEase,
        iconBoxClass,
        className,
      )}
      color={`url(#${gradId})`}
      absoluteStrokeWidth
      strokeWidth={1.65}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--dm-crown-g0)" />
          <stop offset="22%" stopColor="var(--dm-crown-g1)" />
          <stop offset="44%" stopColor="var(--dm-crown-g2)" />
          <stop offset="66%" stopColor="var(--dm-crown-g3)" />
          <stop offset="88%" stopColor="var(--dm-crown-g4)" />
          <stop offset="100%" stopColor="var(--dm-crown-g5)" />
        </linearGradient>
      </defs>
    </Crown>
  )
}
