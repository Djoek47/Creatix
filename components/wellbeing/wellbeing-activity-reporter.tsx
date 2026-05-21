'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const HEARTBEAT_INTERVAL_MS = 120_000
const ACTION_FLUSH_MS = 30_000
const PATH_DEBOUNCE_MS = 450

function flowReporterEnabled(): boolean {
  return typeof process.env.NEXT_PUBLIC_WELLBEING_FLOW_V2 !== 'string' ||
    process.env.NEXT_PUBLIC_WELLBEING_FLOW_V2 !== 'false'
}

async function postActivity(body: Record<string, unknown>) {
  try {
    await fetch('/api/wellbeing/activity', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* ignore */
  }
}

/**
 * Dashboard shell: throttled heartbeats while visible + debounced meaningful pathname / click signals.
 * Server applies UTC buckets and heartbeat spacing (see `/api/wellbeing/activity`).
 */
export function WellbeingActivityReporter() {
  const pathname = usePathname()
  const pendingKind = useRef<'primary_click' | null>(null)
  /** Browser timers are numeric ids; avoid NodeJS.Timeout vs number mismatch under @types/node. */
  const flushTimer = useRef<number | null>(null)
  const pathTimer = useRef<number | null>(null)
  const lastPath = useRef<string | null>(null)

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current != null) return
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null
      const kind = pendingKind.current
      pendingKind.current = null
      if (kind) void postActivity({ actionKind: kind })
    }, ACTION_FLUSH_MS)
  }, [])

  const queuePrimaryClick = useCallback(() => {
    pendingKind.current = 'primary_click'
    scheduleFlush()
  }, [scheduleFlush])

  useEffect(() => {
    if (!flowReporterEnabled()) return

    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void postActivity({ heartbeat: true })
    }

    const id = window.setInterval(tick, HEARTBEAT_INTERVAL_MS)
    tick()

    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!flowReporterEnabled()) return

    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      void postActivity({ heartbeat: true })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (!flowReporterEnabled()) return
    if (lastPath.current === null) {
      lastPath.current = pathname
      return
    }
    if (lastPath.current === pathname) return
    lastPath.current = pathname

    if (pathTimer.current != null) window.clearTimeout(pathTimer.current)
    pathTimer.current = window.setTimeout(() => {
      pathTimer.current = null
      void postActivity({ actionKind: 'pathname_change' })
    }, PATH_DEBOUNCE_MS)

    return () => {
      if (pathTimer.current != null) window.clearTimeout(pathTimer.current)
    }
  }, [pathname])

  useEffect(() => {
    if (!flowReporterEnabled()) return

    const onClick = (ev: MouseEvent) => {
      const el = ev.target
      if (!(el instanceof Element)) return
      const interactive = el.closest(
        'button,a,[role="button"],input,select,textarea,[data-wellbeing-meaningful="true"]',
      )
      if (!interactive) return
      queuePrimaryClick()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [queuePrimaryClick])

  return null
}
