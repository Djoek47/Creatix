/**
 * Transactional mail (welcome, integration alerts, tier emails, contact-form relay to staff):
 * use a **noreply** address verified in Resend — not `support@`, which is for human support and
 * Supabase auth should also send from noreply.
 *
 * - `NOREPLY_FROM_EMAIL` — e.g. `Circe et Venus <noreply@circeetvenus.com>`
 * - Member/support **inbox** for replies and contact routing: `SUPPORT_CONTACT_EMAIL` (see contact route).
 * - Optional: `SUPPORT_OUTBOUND_FROM_EMAIL` when an email should visibly come “from support”
 *   (must be verified in Resend); otherwise do not use support as the From header.
 *
 * If unset, uses Resend’s onboarding sender for local/staging.
 */
const RESEND_ONBOARDING_FROM = 'Circe et Venus <onboarding@resend.dev>'

/** Welcome, billing/system notifications, platform alerts — always noreply (or Resend test). */
export function resolveNoreplyFrom(): string {
  const explicit = process.env.NOREPLY_FROM_EMAIL?.trim()
  if (explicit) return explicit
  return RESEND_ONBOARDING_FROM
}

/** @deprecated Use {@link resolveNoreplyFrom} — behavior is identical. */
export function resolveResendFrom(): string {
  return resolveNoreplyFrom()
}

/**
 * Outbound mail that should present as the support team (member support pipe, internal tickets).
 * - Prefer `SUPPORT_OUTBOUND_FROM_EMAIL` when it must differ from the inbox address.
 * - Else uses `SUPPORT_CONTACT_EMAIL` as `Circe et Venus Support <…>` when set (verify domain in Resend).
 * - Else noreply (same as transactional).
 */
export function resolveSupportOutboundFrom(): string {
  const explicit = process.env.SUPPORT_OUTBOUND_FROM_EMAIL?.trim()
  if (explicit) return explicit
  const inbox = process.env.SUPPORT_CONTACT_EMAIL?.trim()
  if (inbox && inbox.includes('@')) {
    return inbox.includes('<') ? inbox : `Circe et Venus Support <${inbox}>`
  }
  return resolveNoreplyFrom()
}
