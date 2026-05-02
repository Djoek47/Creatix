'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Check, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const triggerClassName = cn(
  'relative h-11 w-11 min-h-[44px] min-w-[44px] rounded-full sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0',
  'border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.1] to-purple-600/[0.12]',
  'text-muted-foreground shadow-none transition-[background-color,border-color,box-shadow,color] duration-300',
  'hover:border-amber-500/50 hover:from-amber-500/[0.14] hover:to-purple-600/[0.16] hover:text-foreground',
  'dark:border-purple-500/40 dark:from-amber-400/[0.08] dark:to-purple-600/[0.14]',
  'dark:hover:border-purple-400/55 dark:hover:from-amber-400/[0.12] dark:hover:to-purple-600/[0.18]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'dark:focus-visible:ring-purple-400/40',
  'header-theme-toggle-aura',
)

const menuContentClass = cn(
  'w-[min(calc(100vw-2rem),13.5rem)] min-w-[12rem] rounded-2xl border border-border/35 bg-popover/90 p-1.5 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.4)] backdrop-blur-xl',
  'dark:border-white/[0.08] dark:bg-popover/92 dark:shadow-[0_20px_50px_-18px_rgba(0,0,0,0.55)]',
)

const appearanceRowBase = cn(
  'group gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-none tracking-tight',
  'outline-none motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none',
  'text-foreground/90 hover:bg-muted/55 hover:text-foreground',
  'focus:bg-muted/55 focus:text-foreground',
  'data-[highlighted]:bg-muted/55 data-[highlighted]:text-foreground',
)

/** Shared icon wells — glow + tint on row hover / keyboard highlight (same signal as hover). */
const menuIconShell = cn(
  'relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 dark:bg-muted/25',
  'motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 motion-reduce:transition-none',
)

const appearanceIconVenus = cn(
  menuIconShell,
  'shadow-none',
  'group-hover:bg-amber-500/[0.14] dark:group-hover:bg-amber-400/[0.1]',
  'group-hover:shadow-[0_0_24px_-7px_rgb(251_191_36_/_0.55)] dark:group-hover:shadow-[0_0_28px_-6px_rgb(251_191_36_/_0.45)]',
  'group-data-[highlighted]:bg-amber-500/[0.14] dark:group-data-[highlighted]:bg-amber-400/[0.1]',
  'group-data-[highlighted]:shadow-[0_0_24px_-7px_rgb(251_191_36_/_0.55)] dark:group-data-[highlighted]:shadow-[0_0_28px_-6px_rgb(251_191_36_/_0.45)]',
)

const appearanceIconCirce = cn(
  menuIconShell,
  'shadow-none',
  'group-hover:bg-circe/15 dark:group-hover:bg-circe/22',
  'group-hover:shadow-[0_0_26px_-8px_rgb(147_51_234_/_0.52)] dark:group-hover:shadow-[0_0_30px_-6px_oklch(0.72_0.18_295_/_0.45)]',
  'group-data-[highlighted]:bg-circe/15 dark:group-data-[highlighted]:bg-circe/22',
  'group-data-[highlighted]:shadow-[0_0_26px_-8px_rgb(147_51_234_/_0.52)] dark:group-data-[highlighted]:shadow-[0_0_30px_-6px_oklch(0.72_0.18_295_/_0.45)]',
)

const appearanceIconAuto = cn(
  menuIconShell,
  'shadow-none',
  'group-hover:bg-gradient-to-br group-hover:from-amber-400/[0.1] group-hover:via-muted/35 group-hover:to-violet-500/[0.12]',
  'group-hover:shadow-[0_0_20px_-7px_rgb(161_161_170_/_0.42),0_0_26px_-8px_rgb(251_191_36_/_0.22),0_0_26px_-8px_rgb(147_112_253_/_0.28)]',
  'dark:group-hover:shadow-[0_0_22px_-6px_rgb(113_113_122_/_0.35),0_0_28px_-8px_rgb(251_191_36_/_0.18),0_0_28px_-8px_oklch(0.7_0.16_295_/_0.38)]',
  'group-data-[highlighted]:bg-gradient-to-br group-data-[highlighted]:from-amber-400/[0.1] group-data-[highlighted]:via-muted/35 group-data-[highlighted]:to-violet-500/[0.12]',
  'group-data-[highlighted]:shadow-[0_0_20px_-7px_rgb(161_161_170_/_0.42),0_0_26px_-8px_rgb(251_191_36_/_0.22),0_0_26px_-8px_rgb(147_112_253_/_0.28)]',
  'dark:group-data-[highlighted]:shadow-[0_0_22px_-6px_rgb(113_113_122_/_0.35),0_0_28px_-8px_rgb(251_191_36_/_0.18),0_0_28px_-8px_oklch(0.7_0.16_295_/_0.38)]',
)

const titleVenusAccent = cn(
  'motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none',
  'group-hover:text-amber-700 group-data-[highlighted]:text-amber-700',
  'dark:group-hover:text-amber-200 dark:group-data-[highlighted]:text-amber-200',
)

const titleCirceAccent = cn(
  'motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none',
  'group-hover:text-circe group-data-[highlighted]:text-circe',
  'dark:group-hover:text-circe-light dark:group-data-[highlighted]:text-circe-light',
)

const titleAutoAccent = cn(
  'motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none',
  'group-hover:text-foreground group-data-[highlighted]:text-foreground',
)

const subtitleClass = cn(
  'mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground/85',
  'motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none',
  'group-hover:text-muted-foreground group-data-[highlighted]:text-muted-foreground',
)

const THEME_STORAGE_KEY = 'creatix-ui-theme'

export function ThemeToggle() {
  const t = useTranslations('dashboard')
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * Keep Radix RadioGroup in sync with next-themes + localStorage. Right after hydration, `theme`
   * can be undefined briefly; reading the storage key avoids a wrong selection and missed updates.
   */
  const appearanceValue = React.useMemo<'light' | 'dark' | 'system'>(() => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') return theme
    if (typeof window === 'undefined') return 'dark'
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
      /* private mode */
    }
    return 'dark'
  }, [theme])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={triggerClassName}>
        <Sun
          className="h-5 w-5 text-amber-700 motion-safe:animate-[pulse_4s_ease-in-out_infinite] dark:text-amber-600"
          aria-hidden
        />
        <span className="sr-only">{t('theme.toggleSrOnly')}</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName}>
          <Sun
            className="h-5 w-5 rotate-0 scale-100 text-amber-700 transition-all motion-safe:animate-[pulse_4s_ease-in-out_infinite] dark:-rotate-90 dark:scale-0 dark:text-amber-500"
            aria-hidden
          />
          <Moon
            className="absolute h-5 w-5 rotate-90 scale-0 text-circe-light transition-all motion-safe:animate-[pulse_4.5s_ease-in-out_infinite] dark:rotate-0 dark:scale-100 dark:text-fuchsia-200"
            aria-hidden
          />
          <span className="sr-only">{t('theme.toggleSrOnly')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={menuContentClass}>
        <DropdownMenuRadioGroup
          value={appearanceValue}
          onValueChange={(v) => {
            if (v === 'light' || v === 'dark' || v === 'system') setTheme(v)
          }}
        >
          <DropdownMenuRadioItem
            value="light"
            className={cn(appearanceRowBase, 'pl-3 [&>span:first-child]:hidden')}
          >
            <span className={appearanceIconVenus}>
              <Sun className="size-4 text-amber-600/85 dark:text-amber-400/90" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-foreground/90', titleVenusAccent)}>{t('theme.venusTitle')}</span>
              <span className={subtitleClass}>{t('theme.venusSubtitle')}</span>
            </span>
            <Check
              className={cn('size-4 shrink-0 text-foreground/40', appearanceValue !== 'light' && 'opacity-0')}
              strokeWidth={2.25}
              aria-hidden
            />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="dark"
            className={cn(appearanceRowBase, 'pl-3 [&>span:first-child]:hidden')}
          >
            <span className={appearanceIconCirce}>
              <Moon className="size-4 text-circe/90 dark:text-circe-light/90" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-foreground/90', titleCirceAccent)}>{t('theme.circeTitle')}</span>
              <span className={subtitleClass}>{t('theme.circeSubtitle')}</span>
            </span>
            <Check
              className={cn('size-4 shrink-0 text-foreground/40', appearanceValue !== 'dark' && 'opacity-0')}
              strokeWidth={2.25}
              aria-hidden
            />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="system"
            className={cn(appearanceRowBase, 'pl-3 [&>span:first-child]:hidden')}
            title={t('theme.systemRowTitle')}
          >
            <span className={appearanceIconAuto}>
              <span className="relative inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
                <Sun
                  strokeWidth={1.65}
                  className="pointer-events-none absolute left-1/2 top-1/2 size-[17px] -translate-x-1/2 -translate-y-1/2 text-amber-600/88 motion-safe:transition-colors [clip-path:inset(0_50%_0_0)] dark:text-amber-400/88 group-hover:text-amber-700 dark:group-hover:text-amber-200 group-data-[highlighted]:text-amber-700 dark:group-data-[highlighted]:text-amber-200"
                  aria-hidden
                />
                <Moon
                  strokeWidth={1.65}
                  className="pointer-events-none absolute left-1/2 top-1/2 size-[17px] -translate-x-1/2 -translate-y-1/2 text-violet-600/88 motion-safe:transition-colors [clip-path:inset(0_0_0_50%)] dark:text-fuchsia-300/88 group-hover:text-violet-700 dark:group-hover:text-fuchsia-200 group-data-[highlighted]:text-violet-700 dark:group-data-[highlighted]:text-fuchsia-200"
                  aria-hidden
                />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-foreground/90', titleAutoAccent)}>{t('theme.matchDeviceTitle')}</span>
              <span className={subtitleClass}>{t('theme.matchDeviceSubtitle')}</span>
            </span>
            <Check
              className={cn('size-4 shrink-0 text-foreground/40', appearanceValue !== 'system' && 'opacity-0')}
              strokeWidth={2.25}
              aria-hidden
            />
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
