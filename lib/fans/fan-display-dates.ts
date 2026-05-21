import type { Fan } from '@/lib/types'

function firstNonEmptyIso(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim()
  }
  return null
}

/** Member since: prefer platform subscription start; else first time this fan row existed in Circe. */
export function fanDisplayMemberSinceIso(fan: Fan): string | null {
  return firstNonEmptyIso(fan.subscription_start, fan.created_at)
}

/** Current period end; if missing, next renewal date when that is all we have. */
export function fanDisplayPeriodEndIso(fan: Fan): string | null {
  return firstNonEmptyIso(fan.subscription_expires_at, fan.subscription_renews_on)
}
