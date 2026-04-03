'use client'

import { cn } from '@/lib/utils'

/** 0–7: new → waxing → full → waning */
const ILLUMINATION: number[] = [0.03, 0.18, 0.42, 0.68, 1, 0.72, 0.45, 0.2]
const IS_WANING: boolean[] = [false, false, false, false, false, true, true, true]

type Size = 'md' | 'lg' | 'xl'

const sizeClass: Record<Size, string> = {
  md: 'h-24 w-24 sm:h-28 sm:w-28',
  lg: 'h-36 w-36 sm:h-44 sm:w-44',
  xl: 'h-44 w-44 sm:h-52 sm:w-52 md:h-56 md:w-56',
}

/**
 * Soft-lit lunar disc with phase shadow — reads as a “real” moon, not only emoji.
 */
export function CosmicMoonPhase({
  phaseIndex,
  size = 'lg',
  className,
  label,
  labelClassName,
}: {
  phaseIndex: number
  size?: Size
  className?: string
  label?: string
  /** Default suits dark hero; use `text-muted-foreground` on light cards. */
  labelClassName?: string
}) {
  const idx = ((phaseIndex % 8) + 8) % 8
  const lit = ILLUMINATION[idx] ?? 0.5
  const waning = IS_WANING[idx] ?? false

  return (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <div
        className={cn('relative shrink-0 rounded-full cosmic-moon-float', sizeClass[size])}
        aria-hidden
      >
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[#f8f4ec] via-[#d4c4b0] to-[#9a8a78]"
          style={{
            boxShadow:
              'inset -12px -12px 28px rgba(0,0,0,0.18), 0 0 48px rgba(255, 230, 200, 0.45), 0 0 80px rgba(180, 140, 255, 0.15)',
          }}
        />
        {/* Waxing: light grows from the right. Waning: light stays on the left. */}
        <div
          className="absolute inset-0 rounded-full bg-[#070714]/95"
          style={{
            clipPath: waning
              ? `inset(0 0 0 ${(1 - lit) * 100}%)`
              : `inset(0 ${(1 - lit) * 100}% 0 0)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 42%)',
          }}
        />
      </div>
      {label ? (
        <p
          className={cn(
            'max-w-[14rem] text-center text-xs font-medium leading-snug sm:text-sm',
            labelClassName ?? 'text-amber-100/90',
          )}
        >
          {label}
        </p>
      ) : null}
    </div>
  )
}
