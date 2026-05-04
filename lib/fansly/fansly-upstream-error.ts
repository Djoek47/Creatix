const MAX_PARTNER_MSG = 280

/** Drop HTML / noise; keep short plain-text partner errors when safe. */
export function sanitizeFanslyPartnerMessage(raw: string | undefined | null): string | undefined {
  if (raw == null || typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!t || t.length > MAX_PARTNER_MSG) return undefined
  if (/<!doctype|<\s*html[\s>]/i.test(t)) return undefined
  return t
}

/** User-facing message for failed Fansly HTTP responses (routes may forward to clients). */
export function formatFanslyUpstreamError(status: number, partnerMessage?: string | null): string {
  const p = sanitizeFanslyPartnerMessage(partnerMessage ?? undefined)
  if (status === 429) {
    return p || 'Fansly API rate limit — try again in a moment.'
  }
  if (status === 401 || status === 403) {
    return p || 'Fansly API rejected the request (authentication or permissions).'
  }
  if (status >= 500) {
    return p || 'Fansly API is temporarily unavailable.'
  }
  if (status >= 400) {
    return p || `Fansly API error (${status}).`
  }
  return p || `Fansly API error (${status}).`
}
