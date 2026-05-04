'use client'

import { useEffect, useState } from 'react'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Default length for Protection MarkIt / integration teaser countdowns. */
export const INTEGRATION_COUNTDOWN_DAYS = 13

/**
 * Cosmetic release countdown for Protection “deep integration” teasers (MarkIt pane, leak alerts).
 * End time is `dayCount` full 24h days after the component’s first mount (rolling “from now”).
 */
export function useIntegrationCountdownEndMs(dayCount: number = INTEGRATION_COUNTDOWN_DAYS): number {
  const [endMs] = useState(() => Date.now() + dayCount * MS_PER_DAY)
  return endMs
}

export function useCountdownMs(targetMs: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()))

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [targetMs])

  return remaining
}

export function formatCountdownParts(totalMs: number): { d: number; h: number; m: number; s: number } {
  const s = Math.floor(totalMs / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return { d, h, m, s: sec }
}
