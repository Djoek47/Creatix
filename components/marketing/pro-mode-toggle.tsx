'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMarketingMode } from '@/components/marketing/marketing-mode-context'

type ProModeToggleProps = {
  className?: string
  proLabel?: string
  proAccent?: 'logo' | 'rainbow'
}

export function ProModeToggle({ className, proLabel = 'Complete', proAccent = 'logo' }: ProModeToggleProps) {
  const { mode, setMode } = useMarketingMode()
  const isPro = mode === 'pro'

  const proButtonAccent =
    proAccent === 'rainbow'
      ? cn(
          isPro &&
            'border-transparent !bg-gradient-to-r !from-violet-600 !via-fuchsia-600 !to-amber-400 !bg-[length:220%_auto] text-white shadow-[0_0_20px_-8px_rgba(167,139,250,0.75),0_0_28px_-10px_rgba(251,191,36,0.6)] motion-safe:animate-gradient-x',
        )
      : cn(
          isPro &&
            'border-transparent !bg-gradient-to-r !from-amber-400 !via-primary !to-violet-500 text-black shadow-[0_0_18px_-8px_rgba(251,191,36,0.8),0_0_24px_-12px_rgba(139,92,246,0.7)] dark:text-white motion-safe:animate-[divine-briefing-gold-purple-glow_3s_ease-in-out_infinite]',
        )

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 backdrop-blur',
        className,
      )}
      role="group"
      aria-label="Display mode"
    >
      <Button
        type="button"
        size="sm"
        variant={mode === 'simple' ? 'default' : 'ghost'}
        className="h-8 rounded-full px-3 text-xs"
        aria-pressed={mode === 'simple'}
        onClick={() => setMode('simple')}
      >
        Simple
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'pro' ? 'default' : 'ghost'}
        className={cn('h-8 rounded-full px-3 text-xs transition-all', proButtonAccent)}
        aria-pressed={mode === 'pro'}
        onClick={() => setMode('pro')}
      >
        {proLabel}
      </Button>
    </div>
  )
}
