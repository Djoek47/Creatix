import { cn } from '@/lib/utils'

/** Guide chip — violet-only animated rim (globals `.sidebar-guide-twin-wrap`; same mechanic as header Tools). */
export const bottomTwinRimPurple = 'sidebar-guide-twin-wrap'

/** Settings chip — amber animated rim (globals `.sidebar-settings-twin-wrap`). */
export const bottomTwinRimGold = 'sidebar-settings-twin-wrap'

/** Desktop inner plate — compact to align with header Tools pill density */
export const bottomTwinInner = cn(
  'flex min-h-8 min-w-min items-center rounded-[9px] transition-[background-color,color,box-shadow] duration-150 ease-out',
  'bg-sidebar/92 backdrop-blur-sm dark:bg-sidebar',
)

/** Drawer surface (mobile rail) */
export const bottomTwinInnerMobile = cn(
  'flex min-h-9 min-w-min items-center rounded-[9px] transition-[background-color,color,box-shadow] duration-150 ease-out',
  'bg-background/92 backdrop-blur-sm',
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
        ? activeCls
        : cn('text-violet-600 dark:text-violet-300', 'drop-shadow-[0_0_8px_rgba(139,92,246,0.42)]')
      : active
        ? activeCls
        : cn('text-amber-600 dark:text-amber-300', 'drop-shadow-[0_0_8px_rgba(245,158,11,0.38)]'),
  )
}
