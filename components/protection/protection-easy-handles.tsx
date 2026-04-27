'use client'

import Link from 'next/link'
import { Plug } from 'lucide-react'
import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'

type Props = {
  handles: ScanIdentityHandleRow[]
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
      <p>
        <span className="font-medium">{handles.length}</span> connected{' '}
        {handles.length === 1 ? 'identity' : 'identities'} will be included in this scan—press{' '}
        <span className="font-medium">Invoke Scan</span> when you&apos;re ready.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Extras (aliases, former names, title phrases) are available in Pro mode.
      </p>
    </div>
  )
}
