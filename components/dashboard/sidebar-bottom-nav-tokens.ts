import { cn } from '@/lib/utils'

/** Guide chip — violet rim; pair with amber Settings for complementary glow. */
export const bottomTwinRimPurple = cn(
  'rounded-xl p-px shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
  'bg-gradient-to-br from-violet-500/75 via-purple-700/55 to-violet-950/90',
  'shadow-[0_0_22px_-8px_rgba(139,92,246,0.55)]',
  'dark:from-violet-400/65 dark:via-purple-950/85 dark:to-violet-950/95 dark:shadow-[0_0_26px_-8px_rgba(167,139,250,0.42)]',
)

/** Settings chip — amber rim only (no violet in this bezel). */
export const bottomTwinRimGold = cn(
  'rounded-xl p-px shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  'bg-gradient-to-br from-amber-400/80 via-yellow-700/45 to-amber-950/90',
  'shadow-[0_0_22px_-8px_rgba(251,191,36,0.5)]',
  'dark:from-amber-500/68 dark:via-amber-900/72 dark:to-amber-950/95 dark:shadow-[0_0_24px_-8px_rgba(251,191,36,0.38)]',
)

export const bottomTwinInner = cn(
  'flex min-h-10 min-w-0 items-center rounded-[11px] transition-[background-color,color,box-shadow] duration-150 ease-out',
  'bg-sidebar/95 backdrop-blur-sm dark:bg-sidebar',
)

/** Drawer surface (mobile rail) — fills inner plate inside gradient rim. */
export const bottomTwinInnerMobile = cn(
  'flex min-h-[44px] min-w-0 items-center rounded-[11px] transition-[background-color,color,box-shadow] duration-150 ease-out',
  'bg-background/92 backdrop-blur-sm',
)
