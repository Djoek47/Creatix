'use client'

import { useEffect, useRef } from 'react'
import { dispatchNotificationsInboxRefresh } from '@/lib/dashboard/notification-ui-bridge'
import { readWellbeingBreakNudgeDisabled } from '@/lib/wellbeing/break-nudge-prefs'
import {
  BREAK_NUDGE_MIN_VISIBLE_MS,
  SESSION_ENERGY_STORAGE_KEY,
  parseSessionEnergyStorage,
} from '@/lib/wellbeing/session-energy-meter'
import { ensureWellbeingSessionClock } from '@/hooks/use-session-energy-meter'

/** How often we re-check visible-tab streak + maybe request a nudge (server still dedupes). */
const CHECK_MS = 60 * 1000

/**
 * While on the dashboard, may ask the server for a Divine "short break" notification only after
 * {@link BREAK_NUDGE_MIN_VISIBLE_MS} of uninterrupted visible-tab time (resets when the tab is hidden).
 * Respects local opt-out and server-side deduplication.
 */
export function WellbeingBreakNudgeScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const cancel = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const ping = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (readWellbeingBreakNudgeDisabled()) return

      ensureWellbeingSessionClock()
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_ENERGY_STORAGE_KEY) : null
      const p = parseSessionEnergyStorage(raw)
      const streak = p?.visibleStreakMs ?? 0
      if (streak < BREAK_NUDGE_MIN_VISIBLE_MS) return

      try {
        const res = await fetch('/api/wellbeing/break-nudge', {
          method: 'POST',
          credentials: 'include',
        })
        const data = (await res.json().catch(() => ({}))) as { inserted?: boolean }
        if (res.ok && data.inserted) {
          dispatchNotificationsInboxRefresh()
        }
      } catch {
        /* ignore */
      }
    }

    void ping()
    intervalRef.current = setInterval(() => void ping(), CHECK_MS)

    const onVis = () => {
      if (document.visibilityState === 'visible') void ping()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      cancel()
    }
  }, [])

  return null
}
