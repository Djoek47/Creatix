'use client'

import { cn } from '@/lib/utils'

/** Matches lucide-react `Star` path (filled star silhouette). */
const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

export type AiStudioNavStarGradientSlot = 'sidebar-desktop' | 'sidebar-mobile'

const GRADIENT_ID: Record<AiStudioNavStarGradientSlot, string> = {
  'sidebar-desktop': 'creatix-ai-studio-nav-star-fill-desktop',
  'sidebar-mobile': 'creatix-ai-studio-nav-star-fill-mobile',
}

type Props = { className?: string; gradientSlot?: AiStudioNavStarGradientSlot }

/** Sidebar AI Studio rail: gradient fill aligned with `.sidebar-ai-studio-text` via CSS `--studio-grad-*` vars on `.ai-studio-sidebar-star`. */
export function AiStudioNavStar({ className, gradientSlot = 'sidebar-desktop' }: Props) {
  const gradId = GRADIENT_ID[gradientSlot]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('ai-studio-sidebar-star', className)}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="-10%"
          y1="50%"
          x2="110%"
          y2="50%"
          gradientUnits="objectBoundingBox"
          gradientTransform="rotate(105 0.5 0.5)"
        >
          <stop offset="0%" stopColor="var(--studio-grad-0)" />
          <stop offset="20%" stopColor="var(--studio-grad-1)" />
          <stop offset="40%" stopColor="var(--studio-grad-2)" />
          <stop offset="60%" stopColor="var(--studio-grad-3)" />
          <stop offset="80%" stopColor="var(--studio-grad-4)" />
          <stop offset="100%" stopColor="var(--studio-grad-5)" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradId})`} d={STAR_PATH} />
    </svg>
  )
}
