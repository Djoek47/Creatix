'use client'

import { Loader2, Radar, Sparkles, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Props = {
  variant: 'easy' | 'pro'
  loading: boolean
  disabled: boolean
  onClick: () => void
}

export function ProtectionInvokeButton({ variant, loading, disabled, onClick }: Props) {
  if (variant === 'pro') {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg border border-circe/40 bg-circe px-4 py-2.5 text-sm font-semibold text-circe-foreground shadow-md transition-shadow',
          'hover:bg-circe/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-circe/50',
          (disabled || loading) && 'pointer-events-none opacity-60',
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Zap className="h-4 w-4 shrink-0" aria-hidden />
        )}
        Run protection scan
      </motion.button>
    )
  }

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={disabled || loading ? undefined : { scale: 1.01 }}
      whileTap={disabled || loading ? undefined : { scale: 0.99 }}
      className={cn(
        'group relative w-full max-w-lg overflow-hidden rounded-2xl p-[2px] text-left shadow-lg transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-circe/50 focus-visible:ring-offset-2',
        (disabled || loading) && 'pointer-events-none opacity-70',
      )}
    >
      <span className="protection-invoke-easy-ring rounded-2xl" aria-hidden />
      <span
        className={cn(
          'relative flex min-h-[5.5rem] flex-col justify-center gap-1 rounded-[14px] bg-gradient-to-br from-circe/95 via-circe to-venus/90 px-6 py-5 text-circe-foreground',
          !loading && 'protection-invoke-easy-glow',
        )}
      >
        <span className="protection-invoke-easy-sheen pointer-events-none absolute inset-0 rounded-[14px] opacity-70" />
        <span className="relative flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 shrink-0 animate-spin text-circe-foreground" aria-hidden />
              Sweeping the web for matches…
            </>
          ) : (
            <>
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-5 w-5 text-[oklch(0.95_0.05_90)]" aria-hidden />
                <Radar
                  className="absolute h-9 w-9 animate-pulse text-[oklch(0.95_0.08_90)] opacity-40"
                  aria-hidden
                />
              </span>
              Scan the web for leaks
            </>
          )}
        </span>
        <span className="relative text-sm font-normal text-circe-foreground/85">
          {loading
            ? 'Hang tight — this can take a minute.'
            : 'Uses the names you picked below. Same scan as Pro — just fewer knobs.'}
        </span>
      </span>
    </motion.button>
  )
}
