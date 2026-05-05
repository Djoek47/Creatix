/**
 * Resend requires a `from` on every send. Without a verified domain, use their
 * onboarding sender; after you verify e.g. `circeetvenus.com` in Resend, set
 * `SUPPORT_FROM_EMAIL` to something like `Circe et Venus <support@circeetvenus.com>`.
 */
export const RESEND_DEFAULT_FROM_NO_VERIFIED_DOMAIN = 'Circe et Venus <onboarding@resend.dev>'

export function resolveResendFrom(): string {
  const custom = process.env.SUPPORT_FROM_EMAIL?.trim()
  if (custom) return custom
  return RESEND_DEFAULT_FROM_NO_VERIFIED_DOMAIN
}
