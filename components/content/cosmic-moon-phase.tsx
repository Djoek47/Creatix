'use client'

import Image from 'next/image'

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

/** Soft terminator blend width (% of disc); tighter when nearly full or new. */
function terminatorFeather(lit: number): number {
  const c = Math.min(lit, 1 - lit)
  return Math.min(11, Math.max(5, 6 + c * 26))
}

function clampPct(n: number): string {
  return `${Math.min(100, Math.max(0, n)).toFixed(2)}%`
}

function nightGradient(lit: number, waning: boolean, feather: number): string | undefined {
  if (lit >= 0.997) return undefined

  if (waning) {
    const t = lit * 100
    const tLo = t - feather * 0.55
    const tHi = t + feather * 0.85
    return `linear-gradient(90deg,
      transparent 0%,
      transparent ${clampPct(tLo)},
      var(--moon-umbra-mid) ${clampPct(t)},
      var(--moon-umbra) ${clampPct(tHi)},
      var(--moon-umbra) 100%)`
  }

  const t = (1 - lit) * 100
  const tLo = t - feather * 0.85
  const tHi = t + feather * 0.55
  return `linear-gradient(90deg,
    var(--moon-umbra) 0%,
    var(--moon-umbra) ${clampPct(Math.max(0, tLo))},
    var(--moon-umbra-mid) ${clampPct(t)},
    transparent ${clampPct(tHi)},
    transparent 100%)`
}

/**
 * Lunar disc: full-disk photo base, soft terminator, soft outer glow — restrained specular.
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
  /** Default suits cosmic hero; use `text-muted-foreground` on light cards. */
  labelClassName?: string
}) {
  const idx = ((phaseIndex % 8) + 8) % 8
  const lit = ILLUMINATION[idx] ?? 0.5
  const waning = IS_WANING[idx] ?? false
  const feather = terminatorFeather(lit)
  const nightOverlay = nightGradient(lit, waning, feather)

  const limbHighlightSide = waning ? '23% 50%' : '77% 50%'

  return (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'cosmic-moon-float relative shrink-0 overflow-hidden rounded-full shadow-[0_2px_14px_-4px_rgba(0,0,0,0.28),0_0_28px_-6px_rgba(255,248,238,0.42),0_0_56px_-14px_rgba(232,218,195,0.28),0_0_88px_-24px_rgba(200,210,230,0.14)] ring-1 ring-inset ring-black/[0.07] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.65),0_0_36px_-8px_rgba(255,252,248,0.22),0_0_72px_-18px_rgba(190,205,255,0.14),0_0_104px_-28px_rgba(140,160,220,0.08)] dark:ring-white/[0.08]',
          '[--moon-umbra-mid:color-mix(in_oklab,var(--moon-umbra)_62%,transparent)]',
          '[--moon-umbra:oklch(0.38_0.035_275_/_0.91)] dark:[--moon-umbra:oklch(0.14_0.028_278_/_0.93)]',
          sizeClass[size],
        )}
        aria-hidden
      >
        <div className="relative size-full shrink-0">
          <Image
            src="/images/lunar/moon-full-disk.jpg"
            alt=""
            fill
            className="origin-center scale-[1.18] object-cover object-center"
            sizes="(max-width: 640px) 144px, 256px"
            priority={false}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: `
              inset -18px -22px 38px rgba(15, 12, 24, 0.22),
              inset 10px 12px 28px rgba(255, 252, 245, 0.35),
              inset 0 0 0 1px rgba(255, 255, 255, 0.12)`,
          }}
        />

        {/* Cooler fill on far side (very subtle lunar albedo read) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-55 dark:opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 120% 95% at 72% 58%, transparent 30%, rgba(80, 78, 110, 0.12) 88%, rgba(70, 68, 98, 0.16) 100%)',
          }}
        />

        {/* Night hemisphere with soft terminator */}
        {nightOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: nightOverlay }}
          />
        ) : null}

        {/* Earthshine hint on deep crescents */}
        {lit < 0.22 ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse 85% 80% at 38% 52%, rgba(168, 184, 210, 0.11) 0%, transparent 62%)',
            }}
          />
        ) : null}

        {/* Sunlit limb: thin grazing highlight opposite terminator */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-[0.55] dark:opacity-[0.48]"
          style={{
            background: `radial-gradient(ellipse 52% 78% at ${limbHighlightSide}, rgba(255, 252, 248, 0.42) 0%, rgba(255, 248, 235, 0.12) 38%, transparent 58%)`,
          }}
        />

        {/* Soft highlight + light grain over photo */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full mix-blend-soft-light opacity-[0.55] dark:opacity-[0.48]"
          style={{
            background: `
              radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.38) 0%, transparent 40%),
              repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 255, 255, 0.02) 0.08deg, transparent 0.35deg)`,
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
