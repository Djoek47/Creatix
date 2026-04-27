'use client'

import Link from 'next/link'
import { AtSign, History, Plug } from 'lucide-react'
import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'
import { scanSourcePlatformDisplayName } from '@/lib/scan-identity'
import { scanIdentityBrandMarkForSource, type ScanIdentityBrandMark } from '@/lib/scan-identity-ui'
import { cn } from '@/lib/utils'

type Props = {
  handles: ScanIdentityHandleRow[]
}

function IdentityBrandMark({ mark, className }: { mark: ScanIdentityBrandMark; className?: string }) {
  const box = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80'
  if (mark.kind === 'image') {
    return (
      <div
        className={cn(
          'flex h-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5',
          'min-w-[6.5rem] max-w-[9rem] sm:min-w-[7rem]',
          className,
        )}
      >
        <img
          src={mark.src}
          alt=""
          className="h-5 w-auto max-h-full max-w-full object-contain object-left"
          width={120}
          height={20}
        />
      </div>
    )
  }
  if (mark.kind === 'special') {
    return (
      <div className={cn(box, 'text-muted-foreground', className)} aria-hidden>
        {mark.type === 'former' ? <History className="h-4 w-4" /> : <AtSign className="h-4 w-4" />}
      </div>
    )
  }
  return (
    <div className={cn(box, 'text-[10px] font-semibold text-muted-foreground', className)} aria-hidden>
      {mark.text}
    </div>
  )
}

/**
 * Minimal “Easy” scan setup: uses only connected integrations—no extra aliases or per-handle toggles.
 * Advanced identity (former names, extras, title hints) lives in Pro mode.
 */
export function ProtectionEasyHandles({ handles }: Props) {
  if (handles.length === 0) {
    return (
      <div
        className="space-y-3 rounded-xl border border-dashed border-border bg-muted/15 p-4 text-center"
        data-tour="protection-identity"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Plug className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Connect a social account first</p>
          <p className="text-xs text-muted-foreground">
            Easy mode runs a leak scan using the usernames from your linked platforms—nothing else to configure.
          </p>
        </div>
        <Link
          href="/dashboard/settings?tab=integrations"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open Integrations
        </Link>
        <p className="text-[11px] text-muted-foreground">
          Need stage names, old @handles, or title hints? Switch to <span className="text-foreground/80">Pro</span> above.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground shadow-sm"
      data-tour="protection-identity"
    >
      <ul className="space-y-2.5">
        {handles.map((h) => {
          const mark = scanIdentityBrandMarkForSource(h.source)
          const platformName = scanSourcePlatformDisplayName(h.source)
          return (
            <li key={`${h.source}:${h.value}`} className="flex min-w-0 items-start gap-3">
              <IdentityBrandMark mark={mark} />
              <div className="min-w-0 flex-1 leading-snug">
                <p className="font-medium text-foreground">
                  <span className="text-muted-foreground">{platformName}</span>{' '}
                  <span className="font-semibold text-foreground">@{h.value}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm text-foreground">
        {handles.length === 1 ? 'This identity' : 'These identities'} will be included in this scan—press{' '}
        <span className="font-medium">Invoke Scan</span> when you&apos;re ready.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Extras (aliases, former names, title phrases) are available in Pro mode.
      </p>
    </div>
  )
}
