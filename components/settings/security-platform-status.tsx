'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PlatformStatusTone, SystemStatusResponse } from '@/lib/system-status-contract'
import { cn } from '@/lib/utils'

function toneChip(tone: PlatformStatusTone) {
  switch (tone) {
    case 'up':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
    case 'idle':
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/35'
    case 'degraded':
      return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/35'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function toneLabel(tone: PlatformStatusTone): string {
  switch (tone) {
    case 'up':
      return 'Operational'
    case 'idle':
      return 'Standby'
    case 'degraded':
      return 'Needs attention'
    default:
      return 'Unknown'
  }
}

export function SecurityPlatformStatus() {
  const [data, setData] = useState<SystemStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/system-status', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Status unavailable.')
      setData(json as SystemStatusResponse)
    } catch {
      setData(null)
      setError('Could not refresh system probes.')
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 90_000)
    return () => window.clearInterval(id)
  }, [load])

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">System probes</p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            Quick read on hosting edge, Circe endpoints, creator link, and model routing—not a guarantee of uptime
            SLA.
          </p>
        </div>
        <button
          type="button"
          className="text-[12px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {error ? <p className="mb-3 text-[13px] text-destructive">{error}</p> : null}

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[4.75rem] animate-pulse rounded-lg bg-muted/50" aria-hidden />
          ))}
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.services.map((svc) => (
              <li
                key={svc.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_0_hsl(var(--border)/40%)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold tracking-tight text-foreground">{svc.label}</p>
                  <span
                    className={cn(
                      'rounded-md border px-2 py-[1px] font-mono text-[10px] font-medium uppercase tracking-wide',
                      toneChip(svc.tone),
                    )}
                  >
                    {toneLabel(svc.tone)}
                  </span>
                </div>
                {svc.detail ? (
                  <p className="text-[11px] leading-snug text-muted-foreground">{svc.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {data.generatedAt ?
            <p className="mt-4 text-[11px] text-muted-foreground/90">
              Snapshot ·{' '}
              <time dateTime={data.generatedAt}>
                {new Date(data.generatedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })}
              </time>
            </p>
          : null}
        </>
      )}
    </div>
  )
}
