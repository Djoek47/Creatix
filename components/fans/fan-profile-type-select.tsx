'use client'

import { motion } from 'framer-motion'
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
    activeClassName: string
  }> = [
    {
      id: 'fan',
      label: 'Typical fan',
      hint: 'Default conversational segment',
      activeClassName: 'border-emerald-500/55 bg-emerald-500/12 text-emerald-100',
    },
    {
      id: 'whale',
      label: 'Whale',
      hint: 'High-value / VIP fan',
      activeClassName: 'border-violet-500/55 bg-violet-500/12 text-violet-100',
    },
    {
      id: 'creator',
      label: 'Creator',
      hint: 'Likely fellow creator',
      activeClassName: 'border-rose-500/55 bg-rose-500/12 text-rose-100',
    },
    {
      id: 'paying_creator',
      label: 'Paying creator',
      hint: 'Creator-type with paid intent',
      activeClassName: 'border-fuchsia-500/55 bg-fuchsia-500/12 text-fuchsia-100',
    },
    {
      id: 'advertisement',
      label: 'Advertisement',
      hint: 'Promo / spam behavior',
      activeClassName: 'border-amber-500/55 bg-amber-500/12 text-amber-100',
    },
    {
      id: 'freeloader',
      label: 'Freeloader',
      hint: 'Low-value long-term segment',
      activeClassName: 'border-slate-500/55 bg-slate-500/12 text-slate-100',
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
          <motion.button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            whileTap={disabled ? undefined : { scale: 0.985 }}
            className={cn(
              'relative rounded-lg border px-2.5 py-2 text-left transition-colors',
              'border-border/70 bg-background/35 text-muted-foreground hover:border-border hover:text-foreground',
              size === 'sm' && 'px-2 py-1.5',
              active && option.activeClassName,
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {active ? (
              <motion.span
                layoutId="fan-profile-type-active-indicator"
                className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/10"
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.55 }}
              />
            ) : null}
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]">
              {option.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug opacity-85">{option.hint}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
