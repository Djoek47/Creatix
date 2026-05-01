import { cn } from '@/lib/utils'

/** Guide chip — violet-only animated rim (globals `.sidebar-guide-twin-wrap`; same mechanic as header Tools). */
export const bottomTwinRimPurple = 'sidebar-guide-twin-wrap'

/** Settings chip — amber animated rim (globals `.sidebar-settings-twin-wrap`; mobile / legacy). */
export const bottomTwinRimGold = 'sidebar-settings-twin-wrap'

/** No animated outer rim — inner uses `.sidebar-settings-divine-pop-inner` (launcher-style border). */
export const bottomTwinRimPlain = 'rounded-[11px] p-0'

/** Desktop inner plate — compact to align with header Tools pill density */
export const bottomTwinInner = cn(
  'flex min-h-8 min-w-min items-center rounded-[11px] transition-[background-color,color,box-shadow] duration-150 ease-out',
  'bg-sidebar/92 backdrop-blur-sm dark:bg-sidebar',
)

/** Guide chip — same launcher popover surface as Settings (`.sidebar-guide-divine-pop-inner`; pair with plain rim). */
export const bottomTwinInnerGuide = cn(
  'sidebar-guide-divine-pop-inner flex min-h-8 min-w-min items-center transition-[filter,box-shadow,color] duration-150 ease-out',
)

/** Settings chip — Divine launcher popover surface (gold rim light · violet rim dark). */
export const bottomTwinInnerSettings = cn(
  'sidebar-settings-divine-pop-inner flex min-h-8 min-w-min items-center transition-[filter,box-shadow,color] duration-150 ease-out',
)

/** Drawer surface (mobile rail) */
export const bottomTwinInnerMobile = cn(
  'flex min-h-9 min-w-min items-center rounded-[11px] transition-[background-color,color,box-shadow] duration-150 ease-out',
  'bg-background/92 backdrop-blur-sm',
)

/** Guide chip in mobile sheet — violet pill on light drawer */
export const bottomTwinInnerGuideMobile = cn(
  'flex min-h-9 min-w-min items-center rounded-[11px] transition-[background-color,color,box-shadow,filter] duration-150 ease-out',
  'border border-violet-500/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] backdrop-blur-sm',
  'bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700',
  'dark:border-violet-950/40 dark:from-violet-500 dark:via-violet-600 dark:to-indigo-900',
)

/** Icon glow aligned with header “Tools” (Sparkles) language — toned per chip */
export function bottomTwinChipIconClasses(
  accent: 'guide' | 'settings',
  active: boolean,
  surface: 'sidebar' | 'sheet' = 'sidebar',
): string {
  const activeCls = surface === 'sidebar' ? 'text-sidebar-foreground' : 'text-foreground'
  return cn(
    'relative z-[1] h-4 w-4 shrink-0 motion-safe:animate-pulse',
    accent === 'guide'
      ? active
        ? surface === 'sidebar'
          ? 'text-violet-950 dark:text-violet-50'
          : activeCls
        : surface === 'sidebar'
          ? cn('text-violet-800/90 dark:text-violet-100/90', 'drop-shadow-[0_0_7px_rgba(139,92,246,0.22)]')
          : cn('text-violet-600 dark:text-violet-300', 'drop-shadow-[0_0_8px_rgba(139,92,246,0.42)]')
      : active
        ? surface === 'sidebar'
          ? 'text-violet-950 dark:text-violet-50'
          : activeCls
        : surface === 'sidebar'
          ? cn('text-violet-800/90 dark:text-violet-100/90', 'drop-shadow-[0_0_7px_rgba(139,92,246,0.22)]')
          : cn('text-amber-600 dark:text-amber-300', 'drop-shadow-[0_0_8px_rgba(245,158,11,0.38)]'),
  )
}
