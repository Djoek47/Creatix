/**
 * Paid checkout guard payloads — kept out of `app/actions/stripe.ts` so client code can
 * import parsers without pulling in `'use server'` (Next requires server actions be async).
 */
export const PAID_CHECKOUT_BELOW_OBSERVED_CODE = 'revenue_tier_below_observed' as const

export type PaidCheckoutBlockedPayload = {
  code: typeof PAID_CHECKOUT_BELOW_OBSERVED_CODE
  requiredMinTier: number
  bandLabel: string
}

export function paidCheckoutBlockedErrorMessage(payload: PaidCheckoutBlockedPayload): string {
  return JSON.stringify(payload)
}

export function parsePaidCheckoutBlockedError(err: unknown): PaidCheckoutBlockedPayload | null {
  const raw = err instanceof Error ? err.message : String(err)
  try {
    const o = JSON.parse(raw) as Partial<PaidCheckoutBlockedPayload>
    if (
      o?.code === PAID_CHECKOUT_BELOW_OBSERVED_CODE &&
      typeof o.requiredMinTier === 'number' &&
      typeof o.bandLabel === 'string'
    ) {
      return {
        code: PAID_CHECKOUT_BELOW_OBSERVED_CODE,
        requiredMinTier: o.requiredMinTier,
        bandLabel: o.bandLabel,
      }
    }
  } catch {
    //
  }
  return null
}
