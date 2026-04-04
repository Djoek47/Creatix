/**
 * Display-only: implied USD value for in-app subscription credits (subscriptions.ai_credits_used).
 * Not COGS — set ADMIN_APP_CREDIT_USD_ESTIMATE to match your internal credit economics.
 */
export function getAppCreditUsdEstimate(): number {
  const raw = process.env.ADMIN_APP_CREDIT_USD_ESTIMATE
  const n = raw != null && raw !== '' ? Number.parseFloat(String(raw)) : Number.NaN
  if (Number.isFinite(n) && n >= 0) return n
  return 0.01
}
