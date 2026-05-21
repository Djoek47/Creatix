/** After this much uninterrupted visible-tab time, client may request a wellbeing break nudge. */
export const BREAK_NUDGE_MIN_VISIBLE_MS = 4 * 60 * 60 * 1000 + 15 * 60 * 1000

/** Wall-clock session fatigue for the Well-being Energy meter (client-only). */

export const SESSION_ENERGY_STORAGE_KEY = 'creatix-wellbeing-session-energy-v1'

/** Visible "logged in" time 0 → full fatigue */
export const SESSION_ENERGY_DEPLETE_MS = 5 * 60 * 60 * 1000

/** Hidden tab: fatigue 1 → 0 over this duration */
export const SESSION_ENERGY_FULL_RECOVERY_MS = 45 * 60 * 1000

/** Ignore clock jumps larger than this when integrating (sleep / background tab) */
export const SESSION_ENERGY_MAX_DELTA_MS = 5 * 60 * 1000

export type SessionEnergyPersisted = {
  fatigue: number
  lastTs: number
  lastLocalDay: string
  /** Uninterrupted visible-tab ms in the current streak; resets when the tab is hidden. */
  visibleStreakMs: number
}

export function sessionEnergyLocalDayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fatigueToEnergyPercent(fatigue: number): number {
  const f = Math.min(1, Math.max(0, fatigue))
  return Math.round(100 * (1 - f))
}

export function parseSessionEnergyStorage(raw: string | null): SessionEnergyPersisted | null {
  if (raw == null || raw === '') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (typeof o.fatigue !== 'number' || typeof o.lastTs !== 'number' || typeof o.lastLocalDay !== 'string') {
      return null
    }
    return {
      fatigue: o.fatigue,
      lastTs: o.lastTs,
      lastLocalDay: o.lastLocalDay,
      visibleStreakMs: typeof o.visibleStreakMs === 'number' ? o.visibleStreakMs : 0,
    }
  } catch {
    return null
  }
}

/**
 * Single step of fatigue integration. `visible` = tab foreground (Page Visibility API).
 */
export function applySessionEnergyTick(
  prev: SessionEnergyPersisted,
  now: number,
  visible: boolean,
): SessionEnergyPersisted {
  const today = sessionEnergyLocalDayKey(new Date(now))
  let fatigue = prev.fatigue
  let lastLocalDay = prev.lastLocalDay
  let visibleStreakMs = prev.visibleStreakMs ?? 0

  if (lastLocalDay !== today) {
    fatigue = 0
    lastLocalDay = today
  }

  const rawDt = now - prev.lastTs
  const dt = Math.min(SESSION_ENERGY_MAX_DELTA_MS, Math.max(0, rawDt))

  if (dt > 0) {
    if (visible) {
      fatigue += dt / SESSION_ENERGY_DEPLETE_MS
      visibleStreakMs += dt
    } else {
      fatigue -= dt / SESSION_ENERGY_FULL_RECOVERY_MS
      visibleStreakMs = 0
    }
    fatigue = Math.min(1, Math.max(0, fatigue))
  }

  return { fatigue, lastTs: now, lastLocalDay: today, visibleStreakMs }
}
