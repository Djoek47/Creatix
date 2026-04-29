import { createHash } from 'node:crypto'

/** Set `PARTNER_CONNECT_DENIAL_LOG=1` to log 403 partner connect denials (CONNECT_ENTITLEMENT_REQUIRED). */
export function logPartnerConnectEntitlementDenied(route: string, userId: string): void {
  if (process.env.PARTNER_CONNECT_DENIAL_LOG !== '1') return
  const userIdHash = createHash('sha256').update(userId).digest('hex').slice(0, 16)
  try {
    console.info(
      '[partner_connect_denied]',
      JSON.stringify({
        route,
        reason: 'CONNECT_ENTITLEMENT_REQUIRED',
        userIdHash,
      }),
    )
  } catch {
    // ignore logging failures
  }
}
