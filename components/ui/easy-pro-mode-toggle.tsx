'use client'

import { cn } from '@/lib/utils'

export type EasyProUiMode = 'easy' | 'pro'

type Props = {
  value: EasyProUiMode
  onChange: (mode: EasyProUiMode) => void
  className?: string
  /** e.g. "Protection layout mode" or "AI tool layout mode" */
  ariaLabel: string
}

export function EasyProModeToggle({ value, onChange, className, ariaLabel }: Props) {
  return (
    <div
      className={cn(
        'inline-flex rounded-full border border-border/45 bg-background/50 p-0.5 text-[12px] font-medium shadow-sm backdrop-blur-md dark:border-white/[0.10] dark:bg-black/35',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onChange('easy')}
        className={cn(
          'rounded-full px-3.5 py-1.5 transition-[color,background-color,box-shadow] duration-200',
          value === 'easy'
            ? 'bg-background/95 text-foreground shadow-sm dark:bg-white/[0.12] dark:text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Easy
      </button>
      <button
        type="button"
        onClick={() => onChange('pro')}
        className={cn(
          'rounded-full px-3.5 py-1.5 transition-[color,background-color,box-shadow] duration-200',
          value === 'pro'
            ? 'bg-background/95 text-foreground shadow-sm dark:bg-white/[0.12] dark:text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Pro
      </button>
    </div>
  )
}
