/** Session grace so creators are not prompted on every Fansly mass send in the same tab. */
export const FANSLY_EMAIL_TWofa_GRACE_MS = 15 * 60 * 1000
export const FANSLY_EMAIL_TWofa_GRACE_KEY = 'creatix_fansly_mass_twofa_grace_until'

export function isFanslyEmailTwofaGraceActive(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(FANSLY_EMAIL_TWofa_GRACE_KEY)
    if (!raw) return false
    const exp = Number(raw)
    if (!Number.isFinite(exp) || Date.now() > exp) {
      sessionStorage.removeItem(FANSLY_EMAIL_TWofa_GRACE_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function setFanslyEmailTwofaGrace(ttlMs = FANSLY_EMAIL_TWofa_GRACE_MS): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(FANSLY_EMAIL_TWofa_GRACE_KEY, String(Date.now() + ttlMs))
  } catch {
    /* ignore quota / private mode */
  }
}
