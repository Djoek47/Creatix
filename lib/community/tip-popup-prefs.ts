/**
 * Client-only: random Circe tip popups (dashboard). Disabled from Settings → Preferences.
 */

export const TIP_POPUPS_ENABLED_KEY = 'creatix_tip_popups_enabled'
export const TIP_POPUP_LAST_SHOWN_AT_KEY = 'creatix_tip_popup_last_shown_at'
export const TIP_POPUP_LAST_TIP_ID_KEY = 'creatix_tip_popup_last_tip_id'

/** Minimum time between automatic popups (ms). */
export const TIP_POPUP_COOLDOWN_MS = 3 * 60 * 60 * 1000

/** Random delay before a popup may appear (ms). */
export const TIP_POPUP_DELAY_MIN_MS = 4_000
export const TIP_POPUP_DELAY_MAX_MS = 11_000

/** Chance to show after delay, if cooldown allows (0–1). */
export const TIP_POPUP_ROLL_CHANCE = 0.38

export const TIP_POPUP_PREFS_EVENT = 'creatix-tip-prefs-changed'
export const TIP_POPUP_FORCE_EVENT = 'creatix-tip-popup-force'

export function readTipPopupsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem(TIP_POPUPS_ENABLED_KEY)
  if (v === null) return true
  return v === 'true' || v === '1'
}

export function writeTipPopupsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TIP_POPUPS_ENABLED_KEY, enabled ? 'true' : 'false')
  window.dispatchEvent(new Event(TIP_POPUP_PREFS_EVENT))
}

export function readTipPopupLastShownAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(TIP_POPUP_LAST_SHOWN_AT_KEY)
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function writeTipPopupLastShownAt(ts: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TIP_POPUP_LAST_SHOWN_AT_KEY, String(ts))
}

export function readTipPopupLastTipId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TIP_POPUP_LAST_TIP_ID_KEY)
}

export function writeTipPopupLastTipId(id: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TIP_POPUP_LAST_TIP_ID_KEY, id)
}

export function canShowTipPopupNow(): boolean {
  if (!readTipPopupsEnabled()) return false
  const last = readTipPopupLastShownAt()
  if (last == null) return true
  return Date.now() - last >= TIP_POPUP_COOLDOWN_MS
}

export function fullTipsPageHrefForTip(tipId: string) {
  return `/dashboard/community/circe-daily#tip-${tipId}`
}

/** Settings “Preview tip” — does not start the automatic popup cooldown. */
export function requestTipPopupPreview() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TIP_POPUP_FORCE_EVENT))
}
