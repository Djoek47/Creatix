'use client'

import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Matches lucide-react `Star` path (filled star silhouette). */
const STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

export type AiStudioNavStarGradientSlot = 'sidebar-desktop' | 'sidebar-mobile'

/** Fill uses a fixed gradient; stroke uses a duplicate + SMIL so only the outline “shimmers” like `.sidebar-ai-studio-text`. */
const FILL_GRADIENT_ID: Record<AiStudioNavStarGradientSlot, string> = {
  'sidebar-desktop': 'creatix-ai-studio-nav-star-fill-desktop',
  'sidebar-mobile': 'creatix-ai-studio-nav-star-fill-mobile',
}
const STROKE_GRADIENT_ID: Record<AiStudioNavStarGradientSlot, string> = {
  'sidebar-desktop': 'creatix-ai-studio-nav-star-stroke-desktop',
  'sidebar-mobile': 'creatix-ai-studio-nav-star-stroke-mobile',
}

type Props = { className?: string; gradientSlot?: AiStudioNavStarGradientSlot }

/** Sidebar AI Studio rail: same sliding gradient as `.sidebar-ai-studio-text` (`gradient-x` timing); stroke uses it when idle. */
export function AiStudioNavStar({ className, gradientSlot = 'sidebar-desktop' }: Props) {
  const fillGradId = FILL_GRADIENT_ID[gradientSlot]
  const strokeGradId = STROKE_GRADIENT_ID[gradientSlot]
  const reduceMotion = useReducedMotion()

  const gradientStops = (
    <>
      <stop offset="0%" stopColor="var(--studio-grad-0)" />
      <stop offset="20%" stopColor="var(--studio-grad-1)" />
      <stop offset="40%" stopColor="var(--studio-grad-2)" />
      <stop offset="60%" stopColor="var(--studio-grad-3)" />
      <stop offset="80%" stopColor="var(--studio-grad-4)" />
      <stop offset="100%" stopColor="var(--studio-grad-5)" />
    </>
  )

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
          id={fillGradId}
          x1="-10%"
          y1="50%"
          x2="110%"
          y2="50%"
          gradientUnits="objectBoundingBox"
          gradientTransform="rotate(105 0.5 0.5)"
        >
          {gradientStops}
        </linearGradient>
        <linearGradient
          id={strokeGradId}
          x1="-0.15"
          y1="0.5"
          x2="1.15"
          y2="0.5"
          gradientUnits="objectBoundingBox"
          gradientTransform="rotate(105 0.5 0.5)"
        >
          {gradientStops}
          {/* Same motion as `.sidebar-ai-studio-text`: `gradient-x`, 4.5s ease, wide band. */}
          {!reduceMotion ? (
            <>
              <animate
                attributeName="x1"
                values="-0.15;0.1;-0.15"
                dur="4.5s"
                keyTimes="0;0.5;1"
                calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="1.15;1.4;1.15"
                dur="4.5s"
                keyTimes="0;0.5;1"
                calcMode="spline"
                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                repeatCount="indefinite"
              />
            </>
          ) : null}
        </linearGradient>
      </defs>
      {/* Fill: visible on row hover/focus or AI Studio (incl. tools) — see globals.css */}
      <path className="ai-studio-star-fill" fill={`url(#${fillGradId})`} d={STAR_PATH} />
      <path className="ai-studio-star-stroke" fill="none" stroke={`url(#${strokeGradId})`} d={STAR_PATH} />
    </svg>
  )
}
