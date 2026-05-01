'use client'

import { useEffect, useState } from 'react'
/**
 * Cosmetic release countdown used for Protection “deep integration” teasers (MarkIt pane, attribution trace UX).
 * Update when targeting a shipping window — keep aligned with product.
 */
export const INTEGRATION_COUNTDOWN_END_MS = new Date('2026-05-09T12:00:00.000Z').getTime()

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
