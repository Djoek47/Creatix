import 'server-only'

import { buildWelcomeEmailContent } from '@/lib/email/welcome-email-templates'
import { resolveNoreplyFrom } from '@/lib/email/resend-from'
import { SUPPORT_EMAIL } from '@/components/marketing/footer-support-social'
import { createServiceRoleClient } from '@/lib/supabase/server'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function greetingFromDisplayName(displayName: string): string {
  const t = displayName.trim()
  if (!t) return 'there'
  const first = t.split(/\s+/)[0]
  return first.length > 0 ? first : 'there'
}

/**
 * Fires after the user reaches the dashboard with a valid session.
 * Idempotent via `profiles.welcome_email_sent_at` (requires migration `100_profiles_welcome_email_sent_at.sql`).
 */
export async function sendWelcomeEmailIfNeeded(params: {
  userId: string
  email: string
  displayName: string
}): Promise<void> {
  const { userId, email, displayName } = params
  if (!email?.includes('@')) return

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return

  let svc: ReturnType<typeof createServiceRoleClient>
  try {
    svc = createServiceRoleClient()
  } catch {
    return
  }

  const { data: row, error: readErr } = await svc
    .from('profiles')
    .select('welcome_email_sent_at')
    .eq('id', userId)
    .maybeSingle()

  if (readErr) {
    console.warn('[welcome-email] read profile:', readErr.message)
    return
  }
  if (!row) return
  if (row.welcome_email_sent_at) return

  const { subject, text, html } = buildWelcomeEmailContent({
    greetingName: greetingFromDisplayName(displayName),
  })

  const replyTo = process.env.SUPPORT_CONTACT_EMAIL?.trim() || SUPPORT_EMAIL

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolveNoreplyFrom(),
        to: [email.trim()],
        ...(replyTo.includes('@') ? { reply_to: replyTo } : {}),
        subject,
        text,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('[welcome-email] Resend:', res.status, err)
      return
    }
  } catch (e) {
    console.warn('[welcome-email]', e instanceof Error ? e.message : e)
    return
  }

  const { error: updErr } = await svc
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('id', userId)
    .is('welcome_email_sent_at', null)

  if (updErr) {
    console.warn('[welcome-email] stamp profile:', updErr.message)
  }
}
