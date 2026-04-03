/**
 * Stable per-browser-tab id for Divine Manager session lease (optional server enforcement).
 */
export function getOrCreateDivineSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const k = 'creatix_divine_session_id'
    let id = window.sessionStorage.getItem(k)
    if (!id) {
      id = crypto.randomUUID()
      window.sessionStorage.setItem(k, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
