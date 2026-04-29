'use client'

import { cn } from '@/lib/utils'

import { PlatformWordmark } from '@/components/platform/platform-wordmark'

export type EasyProUiMode = 'easy' | 'pro'

export type ConnectedMonetizationPlatform = 'onlyfans' | 'fansly'

type Props = {
  value: EasyProUiMode
  onChange: (mode: EasyProUiMode) => void
  className?: string
  /** e.g. "Protection layout mode" or "AI tool layout mode" */
  ariaLabel: string
  /** When provided, renders compact wordmarks for linked OnlyFans / Fansly (scan identity). */
  connectedPlatforms?: readonly ConnectedMonetizationPlatform[]
}

export function EasyProModeToggle({
  value,
  onChange,
  className,
  ariaLabel,
  connectedPlatforms,
}: Props) {
  const integrations = connectedPlatforms?.length
    ? Array.from(new Set(connectedPlatforms)).filter((p) => p === 'onlyfans' || p === 'fansly')
    : []
  /** Stable order: OnlyFans then Fansly */
  integrations.sort((a, b) => {
    const o = { onlyfans: 0, fansly: 1 } as const
    return o[a] - o[b]
  })

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div
        className="inline-flex rounded-full border border-border/45 bg-background/50 p-0.5 text-[12px] font-medium shadow-sm backdrop-blur-md dark:border-white/[0.10] dark:bg-black/35"
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

      {integrations.length > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/35 px-2 py-0.5 shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-black/30"
          aria-label={
            integrations.length === 2
              ? 'Integrations linked: OnlyFans and Fansly'
              : integrations[0] === 'onlyfans'
                ? 'Integration linked: OnlyFans'
                : 'Integration linked: Fansly'
          }
          title={
            integrations.length === 2
              ? 'OnlyFans & Fansly linked'
              : integrations[0] === 'onlyfans'
                ? 'OnlyFans linked'
                : 'Fansly linked'
          }
        >
          {integrations.map((p) => (
            <PlatformWordmark key={p} platform={p} size="xs" />
          ))}
        </span>
      ) : null}
    </div>
  )
}
