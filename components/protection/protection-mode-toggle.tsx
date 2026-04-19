'use client'

import { cn } from '@/lib/utils'

type UiMode = 'easy' | 'pro'

type Props = {
  value: UiMode
  onChange: (mode: UiMode) => void
  className?: string
}

export function ProtectionModeToggle({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        'inline-flex rounded-full border border-border bg-muted/40 p-0.5 text-xs font-medium shadow-sm',
        className,
      )}
      role="group"
      aria-label="Protection layout mode"
    >
      <button
        type="button"
        onClick={() => onChange('easy')}
        className={cn(
          'rounded-full px-3 py-1.5 transition-colors',
          value === 'easy'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Easy
      </button>
      <button
        type="button"
        onClick={() => onChange('pro')}
        className={cn(
          'rounded-full px-3 py-1.5 transition-colors',
          value === 'pro'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Pro
      </button>
    </div>
  )
}
