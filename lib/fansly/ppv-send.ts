/**
 * ApiFansly paid chat messages: `access_type: "ppv"` + `price` (USD), min $1, max $500.
 * @see https://docs.apifansly.com/api-reference/chat-messages/send-message
 */

export function parseFanslyPriceInput(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw > 0 ? raw : undefined
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return undefined
    const n = parseFloat(t)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

/** Round to cents and clamp to ApiFansly USD bounds ($1–$500) after validation. */
export function finalizeFanslyPpvUsd(price: number): number {
  const r = Math.round(price * 100) / 100
  return Math.min(500, Math.max(1, r))
}

/**
 * Normalize PPV `price` from Fansly list-messages / attachment payloads for display.
 * Outbound sends use USD dollars; inbound may be dollars (incl. decimals) or whole cents when > 500.
 */
export function normalizeFanslyIncomingPpvUsd(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null
  if (!Number.isInteger(raw)) {
    const r = Math.round(raw * 100) / 100
    return r > 0 && r <= 500 ? r : null
  }
  const n = raw
  if (n <= 500) return n
  if (n <= 500 * 100) return Math.round(n) / 100
  return null
}

/**
 * Returns an error message when PPV rules are violated; `null` when OK (including free sends).
 */
export function validateFanslyPpvForSend(priceUsd: number | undefined, hasMedia: boolean): string | null {
  if (priceUsd == null || priceUsd <= 0) return null
  if (!hasMedia) return 'Paid messages must include at least one media file.'
  if (priceUsd < 1) return 'Fansly PPV price must be at least $1.'
  if (priceUsd > 500) return 'Fansly PPV price cannot exceed $500.'
  return null
}
