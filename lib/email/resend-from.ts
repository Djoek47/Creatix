/**
 * System / transactional `from` for Resend (welcome, billing, contact pipe, waitlist).
 *
 * - Set `NOREPLY_FROM_EMAIL` after **circeetvenus.com** is verified in Resend (Domains).
 *   Example: `Circe et Venus <noreply@circeetvenus.com>`
 * - If unset, uses Resend’s test sender so local/staging works without DNS; production
 *   should verify the domain and set `NOREPLY_FROM_EMAIL` for real deliverability.
 */
const RESEND_ONBOARDING_FROM = 'Circe et Venus <onboarding@resend.dev>'

export function resolveResendFrom(): string {
  const explicit = process.env.NOREPLY_FROM_EMAIL?.trim()
  if (explicit) return explicit
  return RESEND_ONBOARDING_FROM
}
