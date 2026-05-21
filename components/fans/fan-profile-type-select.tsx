'use client'

import { cn } from '@/lib/utils'
import type { FanProfileType } from '@/lib/fans/profile-types'

export type AudienceProfileValue = FanProfileType

type FanProfileTypeSelectProps = {
  value: AudienceProfileValue
  onChange: (next: AudienceProfileValue) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
}

export function FanProfileTypeSelect({
  value,
  onChange,
  disabled,
  className,
  size = 'sm',
}: FanProfileTypeSelectProps) {
  const options: Array<{
    id: AudienceProfileValue
    label: string
    hint: string
    selectedClassName: string
  }> = [
    {
      id: 'fan',
      label: 'Typical fan',
      hint: 'Default segment',
      selectedClassName:
        'border-emerald-600/45 bg-emerald-500/[0.07] ring-emerald-600/25 dark:border-emerald-400/40 dark:bg-emerald-500/[0.11] dark:ring-emerald-400/20',
    },
    {
      id: 'whale',
      label: 'Whale',
      hint: 'High spend / VIP',
      selectedClassName:
        'border-violet-600/45 bg-violet-500/[0.07] ring-violet-600/25 dark:border-violet-400/40 dark:bg-violet-500/[0.11] dark:ring-violet-400/20',
    },
    {
      id: 'creator',
      label: 'Creator',
      hint: 'Likely fellow creator',
      selectedClassName:
        'border-rose-600/45 bg-rose-500/[0.07] ring-rose-600/25 dark:border-rose-400/40 dark:bg-rose-500/[0.11] dark:ring-rose-400/20',
    },
    {
      id: 'paying_creator',
      label: 'Paying creator',
      hint: 'Paid crossover intent',
      selectedClassName:
        'border-fuchsia-600/45 bg-fuchsia-500/[0.07] ring-fuchsia-600/25 dark:border-fuchsia-400/40 dark:bg-fuchsia-500/[0.11] dark:ring-fuchsia-400/20',
    },
    {
      id: 'advertisement',
      label: 'Advertisement',
      hint: 'Promo / spam',
      selectedClassName:
        'border-amber-600/45 bg-amber-500/[0.07] ring-amber-600/25 dark:border-amber-400/40 dark:bg-amber-500/[0.11] dark:ring-amber-400/20',
    },
    {
      id: 'freeloader',
      label: 'Freeloader',
      hint: 'Low engagement',
      selectedClassName:
        'border-slate-500/45 bg-slate-500/[0.08] ring-slate-500/25 dark:border-slate-400/35 dark:bg-slate-500/[0.12] dark:ring-slate-400/18',
    },
  ]

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-1.5 sm:grid-cols-2',
        size === 'sm' && 'gap-1',
        className,
      )}
      role="radiogroup"
      aria-label="Profile type"
    >
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-lg border px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'border-border/70 bg-background/35 text-muted-foreground hover:border-border hover:text-foreground',
              'enabled:active:scale-[0.985]',
              size === 'sm' && 'px-2 py-1.5',
              active && cn('text-foreground shadow-sm ring-2 ring-offset-1 ring-offset-background', option.selectedClassName),
              !active && 'ring-transparent',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]">
              {option.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug opacity-85">{option.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
