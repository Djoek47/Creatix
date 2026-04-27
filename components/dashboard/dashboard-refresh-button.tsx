'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const PLATFORM_META: Record<
  string,
  { src?: string; short: string; label: string; ring: string }
> = {
  onlyfans: {
    src: '/onlyfans-logo.png',
    short: 'OF',
    label: 'OnlyFans',
    ring: 'shadow-[0_0_14px_rgba(0,175,240,0.55)]',
  },
  fansly: {
    src: '/fansly-logo.png',
    short: 'FL',
    label: 'Fansly',
    ring: 'shadow-[0_0_14px_rgba(0,159,255,0.5)]',
  },
  manyvids: {
    short: 'MV',
    label: 'ManyVids',
    ring: 'shadow-[0_0_12px_rgba(233,30,99,0.45)]',
  },
  loyalfans: {
    short: 'LF',
    label: 'LoyalFans',
    ring: 'shadow-[0_0_12px_rgba(196,30,58,0.45)]',
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
    ring: 'shadow-md',
  }
  return (
    <span
      className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90 transition-all duration-300 ease-out',
        active && cn('z-[1] scale-110 border-transparent', meta.ring),
        !active && 'scale-90 opacity-45',
      )}
      aria-hidden
    >
      {meta.src ? (
        <img src={meta.src} alt="" className="h-4 w-4 object-contain" />
      ) : (
        <span className="text-[9px] font-bold tracking-tight text-muted-foreground">{meta.short}</span>
      )}
      {active ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/25 via-purple-500/30 to-amber-500/20 opacity-90 animate-pulse"
          aria-hidden
        />
      ) : null}
    </span>
  )
}

function GlowChrome({
  busy,
  children,
  className,
}: {
  busy: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('group/refresh relative inline-flex rounded-full', className)}>
      {/* Animated conic ring — gold / purple */}
      <span
        className={cn(
          'pointer-events-none absolute -inset-[2px] rounded-full opacity-0 blur-[1px] transition-opacity duration-500',
          'bg-[conic-gradient(from_0deg,#fbbf24_0deg,#c084fc_120deg,#f59e0b_220deg,#a855f7_300deg,#fbbf24_360deg)]',
          busy ? 'opacity-90 refresh-conic-ring' : 'group-hover/refresh:opacity-70',
        )}
      />
      <span
        className={cn(
          'pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-300',
          'bg-gradient-to-r from-amber-400/35 via-purple-500/40 to-amber-400/35',
          busy ? 'opacity-100 animate-pulse' : 'group-hover/refresh:opacity-100',
        )}
      />
      <span className="relative z-[1] rounded-full bg-card/95 p-px dark:bg-card/90">{children}</span>
    </span>
  )
}

const shellButtonClass =
  'relative overflow-hidden border border-border/70 bg-gradient-to-b from-background to-muted/30 text-foreground shadow-sm transition-all duration-300 ease-out hover:border-amber-500/35 hover:shadow-[0_0_20px_-4px_rgba(251,191,36,0.35),0_0_24px_-6px_rgba(168,85,247,0.28)] hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 dark:border-border/80 dark:from-input/40 dark:to-input/20 dark:hover:border-purple-400/30'

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
      <GlowChrome busy={busy} className="hidden sm:inline-flex">
        <button
          type="button"
          title={title}
          aria-busy={busy}
          aria-label={label}
          disabled={busy}
          onClick={() => void handleRefresh()}
          className={cn(
            shellButtonClass,
            'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium',
            busy && 'min-w-[9.5rem] cursor-wait',
          )}
        >
          <span
            className={cn(
              'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500',
              busy
                ? 'opacity-100 refresh-hover-sheen'
                : 'refresh-hover-sheen group-hover/refresh:opacity-100',
            )}
          />
          <span className="relative z-[1] flex items-center gap-2">
            {busy ? (
              platforms.length > 0 ? (
                <>
                  <span className="flex items-center gap-1 pr-0.5">
                    {platforms.map((p, i) => (
                      <PlatformPulse key={p} platform={p} active={i === activeIndex} />
                    ))}
                  </span>
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-primary"
                    aria-hidden
                  />
                </>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              )
            ) : (
              <RefreshCw
                className="h-4 w-4 shrink-0 text-primary transition-transform duration-700 ease-out group-hover/refresh:rotate-[-200deg] group-hover/refresh:text-amber-600 dark:group-hover/refresh:text-amber-400"
                aria-hidden
              />
            )}
            <span className="tabular-nums">{busy ? 'Syncing…' : 'Refresh data'}</span>
          </span>
        </button>
      </GlowChrome>

      <GlowChrome busy={busy} className="sm:hidden">
        <button
          type="button"
          title={title}
          aria-busy={busy}
          aria-label={label}
          disabled={busy}
          onClick={() => void handleRefresh()}
          className={cn(
            shellButtonClass,
            'grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full',
          )}
        >
          <span
            className={cn(
              'pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500',
              busy
                ? 'opacity-100 refresh-hover-sheen'
                : 'refresh-hover-sheen group-hover/refresh:opacity-100',
            )}
          />
          <span className="relative z-[1] flex flex-col items-center gap-0.5">
            {busy ? (
              platforms.length > 0 ? (
                <>
                  <span className="flex items-center gap-0.5">
                    {platforms.slice(0, 3).map((p) => (
                      <span key={p} className="scale-90">
                        <PlatformPulse
                          platform={p}
                          active={p === platforms[activeIndex]}
                        />
                      </span>
                    ))}
                  </span>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
                </>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              )
            ) : (
              <RefreshCw
                className="h-5 w-5 text-primary transition-transform duration-700 ease-out group-hover/refresh:rotate-[-200deg]"
                aria-hidden
              />
            )}
          </span>
        </button>
      </GlowChrome>
    </>
  )
}
