'use client'

import * as React from 'react'
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

const menuItemClass = cn(
  'gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-none tracking-tight',
  'text-foreground/90 outline-none',
  'focus:bg-muted/55 focus:text-foreground data-[highlighted]:bg-muted/55',
)

const menuIconWrap = 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 dark:bg-muted/25'

const THEME_STORAGE_KEY = 'creatix-ui-theme'

export function ThemeToggle() {
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
        <span className="sr-only">Toggle theme</span>
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
          <span className="sr-only">Toggle theme</span>
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
            className={cn(menuItemClass, 'pl-3 [&>span:first-child]:hidden')}
          >
            <span className={menuIconWrap}>
              <Sun className="size-4 text-amber-600/85 dark:text-amber-400/90" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">Venus</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground/85">Light appearance</span>
            </span>
            <Check
              className={cn('size-4 shrink-0 text-foreground/40', appearanceValue !== 'light' && 'opacity-0')}
              strokeWidth={2.25}
              aria-hidden
            />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="dark"
            className={cn(menuItemClass, 'pl-3 [&>span:first-child]:hidden')}
          >
            <span className={menuIconWrap}>
              <Moon className="size-4 text-circe/90 dark:text-circe-light/90" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">Circe</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground/85">Dark appearance</span>
            </span>
            <Check
              className={cn('size-4 shrink-0 text-foreground/40', appearanceValue !== 'dark' && 'opacity-0')}
              strokeWidth={2.25}
              aria-hidden
            />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="system"
            className={cn(menuItemClass, 'pl-3 [&>span:first-child]:hidden')}
            title="Automatically uses light or dark to match your device."
          >
            <span className={menuIconWrap}>
              <span
                className="text-[10px] font-semibold tabular-nums tracking-wide text-muted-foreground/75"
                aria-hidden
              >
                Auto
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">Match device</span>
              <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground/85">
                OS light/dark only—not your profile timezone
              </span>
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
