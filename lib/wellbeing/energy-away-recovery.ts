/** localStorage key: ISO-ish tab hide time for wellbeing flow energy recovery */
export const WELLBEING_FLOW_TAB_HIDDEN_AT_KEY = 'creatix:wellbeing:flow_tab_hidden_at'

/** Time constant (ms): ~63% of the gap to “rested” (100) after this long away */
const RECOVERY_TAU_MS = 22 * 60 * 1000

/** Ignore sub-minute switches (alt-tab noise) */
const MIN_AWAY_MS = 60 * 1000

/** Cap how far back we extrapolate (keeps formula stable) */
const MAX_AWAY_MS = 16 * 60 * 60 * 1000

/**
 * While the tab is in the background, treat energy as drifting toward a rested ceiling.
 * Longer away → closer to 100; short returns → nearly unchanged.
 */
export function energyAfterRestAway(baseEnergy: number, awayMs: number): number {
  if (awayMs < MIN_AWAY_MS) return baseEnergy
  const away = Math.min(Math.max(0, awayMs), MAX_AWAY_MS)
  const f = 1 - Math.exp(-away / RECOVERY_TAU_MS)
  const next = baseEnergy + (100 - baseEnergy) * f
  return Math.round(Math.min(100, Math.max(0, next)))
}

export function readFlowTabHiddenTimestamp(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(WELLBEING_FLOW_TAB_HIDDEN_AT_KEY)
    if (!raw) return null
    const t = parseInt(raw, 10)
    return Number.isFinite(t) ? t : null
  } catch {
    return null
  }
}

export function writeFlowTabHiddenTimestamp(nowMs: number = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WELLBEING_FLOW_TAB_HIDDEN_AT_KEY, String(nowMs))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearFlowTabHiddenTimestamp(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(WELLBEING_FLOW_TAB_HIDDEN_AT_KEY)
  } catch {
    /* ignore */
  }
}
