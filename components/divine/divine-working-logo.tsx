'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { VoiceSurfaceState } from '@/components/divine/voice-session-context'

export function DivineWorkingLogo({
  working,
  variant,
  phaseHint,
  className,
  wordmarkClassName,
  statusVisibility = 'full',
}: {
  /** Legacy: when true, treat as working (non-idle) unless `variant` is set. */
  working?: boolean
  /** When provided, drives border/text: listening | thinking | speaking | needs_attention. */
  variant?: VoiceSurfaceState
  /** When working, replaces the default “Divine is working…” line (e.g. tools vs reply). */
  phaseHint?: string | null
  className?: string
  /** Optional class for the “Divine” label (e.g. ai-tools-wordmark in launcher). */
  wordmarkClassName?: string
  /** Hide Idle / Working subline when the parent shows status elsewhere (e.g. launcher). */
  statusVisibility?: 'full' | 'hidden'
}) {
  const v: VoiceSurfaceState =
    variant ?? (working ? 'thinking' : 'listening')

  const label =
    v === 'speaking'
      ? 'Speaking…'
      : v === 'thinking'
        ? (phaseHint ?? 'Thinking…')
        : v === 'needs_attention'
          ? 'Needs attention'
          : 'Listening'

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <div
        className={cn(
          'relative h-7 w-7 overflow-hidden rounded-full border bg-background',
          v === 'listening' && 'border-border',
          v === 'thinking' && 'border-purple-500/80 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.35)]',
          v === 'speaking' && 'border-amber-400/90 shadow-[0_0_14px_rgba(245,158,11,0.45)]',
          v === 'needs_attention' && 'border-orange-400/90 shadow-[0_0_14px_rgba(251,146,60,0.45)]',
        )}
      >
        <Image
          src="/favicon.png"
          alt="Circe et Venus"
          fill
          sizes="28px"
          className="object-contain"
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            'font-medium',
            wordmarkClassName,
            !wordmarkClassName && v === 'thinking' && 'text-purple-600 dark:text-purple-400',
            !wordmarkClassName && v === 'speaking' && 'text-amber-600 dark:text-amber-400',
            !wordmarkClassName && v === 'needs_attention' && 'text-orange-600 dark:text-orange-400',
            !wordmarkClassName && v === 'listening' && 'text-foreground',
          )}
        >
          Divine
        </span>
        {statusVisibility === 'full' ? (
          <span
            className={cn(
              'text-[11px]',
              v === 'thinking' && 'text-purple-600/90 dark:text-purple-400/90',
              v === 'speaking' && 'text-amber-600/90 dark:text-amber-400/90',
              v === 'needs_attention' && 'text-orange-600/90 dark:text-orange-400/90',
            )}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  )
}
