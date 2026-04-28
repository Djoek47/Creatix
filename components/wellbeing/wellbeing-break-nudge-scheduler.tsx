'use client'

import { useEffect, useRef } from 'react'
import { dispatchNotificationsInboxRefresh } from '@/lib/dashboard/notification-ui-bridge'
import { readWellbeingBreakNudgeDisabled } from '@/lib/wellbeing/break-nudge-prefs'

/** First nudge after mount; then attempt on this interval while the tab is visible. */
const FIRST_DELAY_MS = 32 * 60 * 1000
const REPEAT_MS = 58 * 60 * 1000

/**
 * While on the dashboard, periodically asks the server to add a Divine notification nudging a break.
 * Respects local opt-out (Well-being page toggle) and server-side deduplication.
 */
export function WellbeingBreakNudgeScheduler() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const cancel = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      timerRef.current = null
      intervalRef.current = null
    }

    const ping = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (readWellbeingBreakNudgeDisabled()) return
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

    timerRef.current = setTimeout(() => {
      void ping()
      intervalRef.current = setInterval(() => void ping(), REPEAT_MS)
    }, FIRST_DELAY_MS)

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
