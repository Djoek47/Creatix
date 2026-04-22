'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMarketingMode } from '@/components/marketing/marketing-mode-context'

export function ProModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useMarketingMode()

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
        className="h-8 rounded-full px-3 text-xs"
        aria-pressed={mode === 'pro'}
        onClick={() => setMode('pro')}
      >
        Pro
      </Button>
    </div>
  )
}
