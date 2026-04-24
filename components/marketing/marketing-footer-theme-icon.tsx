'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

/**
 * Icon-only light / dark toggle for marketing chrome (footer).
 * Uses resolved appearance so system theme is reflected correctly.
 */
export function MarketingFooterThemeIcon() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      disabled={!mounted}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        'border border-border/45 bg-background/35 text-muted-foreground backdrop-blur-sm',
        'transition-[color,background-color,border-color,box-shadow] duration-200',
        'hover:border-border/70 hover:bg-background/55 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {isDark ? (
        <Moon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} aria-hidden />
      ) : (
        <Sun className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  )
}
