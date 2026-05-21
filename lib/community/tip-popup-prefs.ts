/**
 * Client-only: random Circe tip popups (dashboard). Disabled from Settings → Preferences.
 */

export const TIP_POPUPS_ENABLED_KEY = 'creatix_tip_popups_enabled'
export const TIP_POPUP_LAST_SHOWN_AT_KEY = 'creatix_tip_popup_last_shown_at'
export const TIP_POPUP_LAST_TIP_ID_KEY = 'creatix_tip_popup_last_tip_id'
/** Count of automatic (cooldown-eligible) tips shown in this browser — drives veteran decay. */
export const TIP_POPUP_LIFETIME_SHOWN_KEY = 'creatix_tip_popup_lifetime_automatic_shown'

/** Baseline minimum time between automatic popups (ms); effective cooldown uses account age + lifetime decay. */
export const TIP_POPUP_COOLDOWN_MS = 2.5 * 60 * 60 * 1000

/** Random delay before a popup may appear (ms). */
export const TIP_POPUP_DELAY_MIN_MS = 8_000
export const TIP_POPUP_DELAY_MAX_MS = 26_000

/** Baseline roll probability before account-age / lifetime modifiers (0–1). */
export const TIP_POPUP_ROLL_CHANCE = 0.52

/** While on dashboard, retry scheduling automatic tips at this interval (not every navigation). */
export const TIP_POPUP_SITE_WIDE_RETRY_MS = 10 * 60 * 1000

/**
 * When > 0, overrides reading-time visibility when env `NEXT_PUBLIC_CIRCE_TIP_POPUP_VISIBLE_MS` is unset.
 * Production/dev default `0` → use natural read-length (~14–32s). Set env for longer QA sessions only.
 */
export const TIP_POPUP_QA_FIXED_VISIBLE_MS = 0

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

export function readLifetimeTipsShown(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(TIP_POPUP_LIFETIME_SHOWN_KEY)
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(500, n) : 0
}

export function incrementLifetimeTipsShown() {
  if (typeof window === 'undefined') return
  const next = readLifetimeTipsShown() + 1
  window.localStorage.setItem(TIP_POPUP_LIFETIME_SHOWN_KEY, String(next))
}

/** Whole days since Supabase `user.created_at` (ISO). Null if unknown. */
export function accountAgeDaysFromCreatedAt(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return null
  return (Date.now() - t) / 86_400_000
}

export function effectiveCooldownMs(accountAgeDays: number | null): number {
  const lifetimeShown = readLifetimeTipsShown()
  const lt = Math.min(120, lifetimeShown)
  let ms = TIP_POPUP_COOLDOWN_MS * (1 + lt * 0.014)

  if (accountAgeDays != null && accountAgeDays <= 7) {
    ms = Math.min(ms, 40 * 60 * 1000)
  } else if (accountAgeDays != null && accountAgeDays <= 30) {
    ms = Math.min(ms, 88 * 60 * 1000)
  } else if (accountAgeDays != null && accountAgeDays <= 90) {
    ms = Math.min(ms, 118 * 60 * 1000)
  }

  return Math.max(20 * 60 * 1000, Math.round(ms))
}

export function effectiveRollChance(accountAgeDays: number | null): number {
  const lifetimeShown = readLifetimeTipsShown()
  const lt = Math.min(150, lifetimeShown)
  let p = TIP_POPUP_ROLL_CHANCE

  if (accountAgeDays != null && accountAgeDays <= 7) p += 0.28
  else if (accountAgeDays != null && accountAgeDays <= 30) p += 0.14
  else if (accountAgeDays != null && accountAgeDays <= 90) p += 0.06

  p *= Math.max(0.22, 1 - lt * 0.0075)
  return Math.min(0.93, Math.max(0.09, p))
}

export function canShowAutomaticPopup(accountAgeDays: number | null): boolean {
  if (!readTipPopupsEnabled()) return false
  const last = readTipPopupLastShownAt()
  const cooldown = effectiveCooldownMs(accountAgeDays)
  if (last == null) return true
  return Date.now() - last >= cooldown
}

/** Legacy name — uses automatic cooldown rules with optional account age when passed from the popup host. */
export function canShowTipPopupNow(accountAgeDays: number | null = null): boolean {
  return canShowAutomaticPopup(accountAgeDays)
}

export function fullTipsPageHrefForTip(tipId: string) {
  return `/dashboard/community/circe-daily#tip-${tipId}`
}

/** Settings “Preview tip” — does not start the automatic popup cooldown. */
export function requestTipPopupPreview() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TIP_POPUP_FORCE_EVENT))
}
