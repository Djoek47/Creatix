'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'

const PLATFORM_META: Record<
  string,
  { src?: string; short: string; label: string; ring: string }
> = {
  onlyfans: {
    src: ONLYFANS_LOGO_SRC,
    short: 'OnlyFans',
    label: 'OnlyFans',
    ring: 'ring-1 ring-sky-500/35 bg-muted/40',
  },
  fansly: {
    src: FANSLY_LOGO_SRC,
    short: 'FL',
    label: 'Fansly',
    ring: 'ring-1 ring-blue-400/35 bg-muted/40',
  },
}

function PlatformPulse({
  platform,
  active,
}: {
  platform: string
  active: boolean
}) {
  const meta = PLATFORM_META[platform] ?? {
    short: platform.slice(0, 2).toUpperCase(),
    label: platform,
    ring: 'ring-1 ring-border/50',
  }
  return (
    <span
      className={cn(
        'relative flex h-7 min-w-[2.5rem] max-w-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background/90 px-0.5 transition-all duration-300 ease-out',
        active && cn('z-[1] scale-105 border-transparent', meta.ring),
        !active && 'scale-95 opacity-50',
      )}
      aria-hidden
    >
      {meta.src ? (
        <img src={meta.src} alt="" className="h-3.5 w-auto max-w-full object-contain object-left" />
      ) : (
        <span className="text-[9px] font-bold tracking-tight text-muted-foreground">{meta.short}</span>
      )}
      {active ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-md bg-foreground/5 opacity-100 motion-safe:animate-pulse"
          aria-hidden
        />
      ) : null}
    </span>
  )
}

const shellButtonClass =
  'group/refresh relative overflow-hidden rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-500/[0.16] via-purple-500/[0.1] to-violet-600/[0.14] text-amber-950 shadow-[0_0_22px_-8px_rgba(251,191,36,0.32),0_0_20px_-10px_rgba(168,85,247,0.22)] transition-all duration-300 hover:border-amber-400/55 hover:from-amber-500/[0.22] hover:via-purple-500/[0.14] hover:to-violet-600/[0.18] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 dark:border-amber-400/35 dark:from-amber-400/[0.12] dark:via-purple-500/[0.1] dark:to-violet-600/[0.14] dark:text-amber-50 dark:shadow-[0_0_26px_-8px_rgba(192,132,252,0.28),0_0_22px_-10px_rgba(251,191,36,0.2)] dark:hover:border-amber-300/50'

/**
 * Syncs all connected platforms (same pattern as ConnectedPlatforms), then full page reload
 * so RSC-backed mentions, leaks, and widgets pick up fresh data.
 */
export function DashboardRefreshButton() {
  const [busy, setBusy] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>([])
  const [tick, setTick] = useState(0)
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('platform_connections')
        .select('platform')
        .eq('user_id', user.id)
        .eq('is_connected', true)
      const list = (data ?? [])
        .map((r: { platform?: string }) => r.platform)
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
      if (!cancelled) setPlatforms(list)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    if (!busy || platforms.length === 0) return
    const id = window.setInterval(() => setTick((t) => t + 1), 420)
    return () => window.clearInterval(id)
  }, [busy, platforms.length])

  const activeIndex = useMemo(() => {
    if (platforms.length === 0) return 0
    return tick % platforms.length
  }, [tick, platforms])

  const handleRefresh = useCallback(async () => {
    if (busyRef.current) return
    setBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('platform_connections')
          .select('platform')
          .eq('user_id', user.id)
          .eq('is_connected', true)
        const list = (data ?? [])
          .map((r: { platform?: string }) => r.platform)
          .filter((p): p is string => typeof p === 'string' && p.length > 0)
        setPlatforms(list)
        await Promise.allSettled(list.map((p) => fetch(`/api/${p}/sync`, { method: 'POST' })))
      }
    } catch {
      // still reload so UI is not stuck
    } finally {
      window.location.reload()
    }
  }, [])

  const label = busy ? 'Syncing…' : 'Refresh data'
  const title =
    'Sync all connected platforms, then reload (mentions, leaks, dashboard)'

  return (
    <>
      <button
        type="button"
        title={title}
        aria-busy={busy}
        aria-label={label}
        disabled={busy}
        onClick={() => void handleRefresh()}
        className={cn(
          shellButtonClass,
          'hidden h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium sm:inline-flex',
          busy && 'min-w-[9.5rem] cursor-wait',
        )}
      >
        {busy ? (
          platforms.length > 0 ? (
            <>
              <span className="flex items-center gap-1 pr-0.5">
                {platforms.map((p, i) => (
                  <PlatformPulse key={p} platform={p} active={i === activeIndex} />
                ))}
              </span>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-800 dark:text-amber-200" aria-hidden />
            </>
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-amber-800 dark:text-amber-200" aria-hidden />
          )
        ) : (
          <RefreshCw
            className="h-4 w-4 shrink-0 text-amber-800 transition-transform duration-500 ease-out group-hover/refresh:-rotate-45 group-hover/refresh:text-violet-700 dark:text-amber-200 dark:group-hover/refresh:text-fuchsia-300"
            aria-hidden
          />
        )}
        <span className="shrink-0 whitespace-nowrap text-amber-950 dark:text-amber-50">
          {busy ? 'Syncing…' : 'Refresh data'}
        </span>
      </button>

      <button
        type="button"
        title={title}
        aria-busy={busy}
        aria-label={label}
        disabled={busy}
        onClick={() => void handleRefresh()}
        className={cn(
          shellButtonClass,
          'grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full sm:hidden',
        )}
      >
        {busy ? (
          platforms.length > 0 ? (
            <span className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-0.5">
                {platforms.slice(0, 3).map((p) => (
                  <span key={p} className="scale-90">
                    <PlatformPulse platform={p} active={p === platforms[activeIndex]} />
                  </span>
                ))}
              </span>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-800 dark:text-amber-200" aria-hidden />
            </span>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-amber-800 dark:text-amber-200" aria-hidden />
          )
        ) : (
          <RefreshCw
            className="h-5 w-5 text-amber-800 transition-transform duration-500 ease-out group-hover/refresh:-rotate-45 group-hover/refresh:text-violet-700 dark:text-amber-200 dark:group-hover/refresh:text-fuchsia-300"
            aria-hidden
          />
        )}
      </button>
    </>
  )
}
