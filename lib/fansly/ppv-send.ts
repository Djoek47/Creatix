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
 * Returns an error message when PPV rules are violated; `null` when OK (including free sends).
 */
export function validateFanslyPpvForSend(priceUsd: number | undefined, hasMedia: boolean): string | null {
  if (priceUsd == null || priceUsd <= 0) return null
  if (!hasMedia) return 'Paid messages must include at least one media file.'
  if (priceUsd < 1) return 'Fansly PPV price must be at least $1.'
  if (priceUsd > 500) return 'Fansly PPV price cannot exceed $500.'
  return null
}
