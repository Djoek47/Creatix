'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Check, Cloud, Cpu, RefreshCw, Sparkles, Wifi, Zap } from 'lucide-react'

import type { PlatformStatusTone, SystemStatusResponse } from '@/lib/system-status-contract'
import { cn } from '@/lib/utils'

type SystemMood = 'all-clear' | 'one-platform' | 'both-platforms' | 'standby' | 'degraded'

function toneChip(tone: PlatformStatusTone) {
  switch (tone) {
    case 'up':
      return 'border-emerald-400/35 bg-emerald-400/15 text-emerald-800 dark:text-emerald-200'
    case 'idle':
      return 'border-orange-400/35 bg-orange-400/12 text-orange-800 dark:text-orange-200'
    case 'degraded':
      return 'border-red-400/40 bg-red-500/12 text-red-800 dark:text-red-200'
    default:
      return 'border-border bg-muted text-muted-foreground'
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

function moodFromData(data: SystemStatusResponse): SystemMood {
  if (data.services.some((svc) => svc.tone === 'degraded')) return 'degraded'
  const onlyFans = data.services.find((svc) => svc.id === 'onlyfans-link')?.tone === 'up'
  const fansly = data.services.find((svc) => svc.id === 'fansly-link')?.tone === 'up'
  if (onlyFans && fansly) return 'both-platforms'
  if (onlyFans || fansly) return 'one-platform'
  if (data.services.some((svc) => svc.tone === 'idle')) return 'standby'
  return 'all-clear'
}

function moodCopy(mood: SystemMood): { title: string; detail: string; badge: string } {
  switch (mood) {
    case 'both-platforms':
      return {
        title: 'Creator network glowing',
        detail: 'OnlyFans and Fansly are linked. The workspace is reading both creator channels.',
        badge: 'Dual platform',
      }
    case 'one-platform':
      return {
        title: 'Creator link online',
        detail: 'One creator platform is connected. Add the second when you want the full cross-platform view.',
        badge: 'Platform online',
      }
    case 'degraded':
      return {
        title: 'Something needs attention',
        detail: 'One probe reported a problem. Refresh after checking the affected service.',
        badge: 'Action needed',
      }
    case 'standby':
      return {
        title: 'Core systems operational',
        detail: 'Creatix is healthy. Creator platform feeds are standing by until an account is connected.',
        badge: 'Standby',
      }
    default:
      return {
        title: 'All systems operational',
        detail: 'Hosting, Circe endpoints, creator links, and model routing are green.',
        badge: 'Operational',
      }
  }
}

function moodShell(mood: SystemMood) {
  switch (mood) {
    case 'both-platforms':
      return {
        shell:
          'border-amber-300/35 bg-[radial-gradient(circle_at_15%_0%,rgba(250,204,21,0.28),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.30),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.32))] shadow-[0_24px_90px_-42px_rgba(147,51,234,0.78)] dark:bg-[radial-gradient(circle_at_15%_0%,rgba(250,204,21,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.26),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(15,23,42,0.34))]',
        orb: 'from-amber-300 via-fuchsia-400 to-violet-500',
        badge: 'border-amber-300/45 bg-amber-200/25 text-amber-950 dark:text-amber-100',
      }
    case 'one-platform':
      return {
        shell:
          'border-sky-300/35 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.34))] shadow-[0_22px_80px_-44px_rgba(14,165,233,0.78)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.20),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(15,23,42,0.34))]',
        orb: 'from-cyan-300 via-sky-400 to-blue-500',
        badge: 'border-sky-300/45 bg-sky-200/25 text-sky-950 dark:text-sky-100',
      }
    case 'degraded':
      return {
        shell:
          'border-red-300/40 bg-[radial-gradient(circle_at_12%_0%,rgba(248,113,113,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,255,255,0.36))] shadow-[0_22px_80px_-44px_rgba(239,68,68,0.72)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(248,113,113,0.20),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(15,23,42,0.34))]',
        orb: 'from-rose-300 via-red-400 to-orange-500',
        badge: 'border-red-300/45 bg-red-200/25 text-red-950 dark:text-red-100',
      }
    case 'standby':
      return {
        shell:
          'border-orange-300/35 bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.23),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.70),rgba(255,255,255,0.32))] shadow-[0_22px_80px_-48px_rgba(249,115,22,0.58)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(15,23,42,0.34))]',
        orb: 'from-orange-300 via-amber-400 to-yellow-500',
        badge: 'border-orange-300/45 bg-orange-200/25 text-orange-950 dark:text-orange-100',
      }
    default:
      return {
        shell:
          'border-emerald-300/35 bg-[radial-gradient(circle_at_12%_0%,rgba(52,211,153,0.25),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.34))] shadow-[0_22px_80px_-46px_rgba(16,185,129,0.66)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(52,211,153,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(15,23,42,0.34))]',
        orb: 'from-emerald-300 via-green-400 to-teal-500',
        badge: 'border-emerald-300/45 bg-emerald-200/25 text-emerald-950 dark:text-emerald-100',
      }
  }
}

function serviceIcon(id: SystemStatusResponse['services'][number]['id']) {
  switch (id) {
    case 'vercel-edge':
      return Cloud
    case 'circe':
      return Activity
    case 'onlyfans-link':
    case 'fansly-link':
      return Wifi
    case 'ai-models':
      return Cpu
    default:
      return Zap
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

  const mood = data ? moodFromData(data) : 'standby'
  const copy = moodCopy(mood)
  const style = moodShell(mood)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border px-4 py-4 backdrop-blur-2xl backdrop-saturate-150 sm:px-5',
        'ring-1 ring-white/45 dark:ring-white/[0.08]',
        style.shell,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.46),transparent_38%,rgba(255,255,255,0.12))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.10),transparent_42%,rgba(255,255,255,0.04))]"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg',
              style.orb,
            )}
          >
            {mood === 'both-platforms' ? (
              <Sparkles className="h-5 w-5" aria-hidden />
            ) : (
              <Check className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                System probes
              </p>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.10em]',
                  style.badge,
                )}
              >
                {copy.badge}
              </span>
            </div>
            <p className="mt-1 text-[1.05rem] font-semibold leading-tight tracking-tight text-foreground">
              {copy.title}
            </p>
            <p className="mt-1 max-w-2xl text-[13px] leading-snug text-muted-foreground">{copy.detail}</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/45 bg-background/45 px-3 text-[12px] font-medium text-foreground/78 shadow-sm transition-colors hover:bg-background/70 hover:text-foreground dark:border-white/[0.10] dark:bg-white/[0.06]"
          onClick={() => void load()}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {error ? <p className="relative mb-3 text-[13px] text-destructive">{error}</p> : null}

      {!data ? (
        <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[5.75rem] animate-pulse rounded-2xl bg-background/35" aria-hidden />
          ))}
        </div>
      ) : (
        <>
          <ul className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.services.map((svc) => {
              const Icon = serviceIcon(svc.id)
              return (
                <li
                  key={svc.id}
                  className="group flex min-h-[5.75rem] flex-col justify-between gap-3 rounded-2xl border border-white/45 bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_40px_-32px_rgba(15,23,42,0.45)] transition-transform hover:-translate-y-0.5 dark:border-white/[0.09] dark:bg-white/[0.055]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/45 bg-background/45 text-foreground/75 dark:border-white/[0.10] dark:bg-white/[0.06]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.11em]',
                        toneChip(svc.tone),
                      )}
                    >
                      {toneLabel(svc.tone)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold tracking-tight text-foreground">{svc.label}</p>
                    {svc.detail ? (
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{svc.detail}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {data.generatedAt ? (
            <p className="relative mt-4 text-[11px] text-muted-foreground/90">
              Snapshot ·{' '}
              <time dateTime={data.generatedAt}>
                {new Date(data.generatedAt).toLocaleString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
