import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDivineAppNotification, type NotificationInsertClient } from '@/lib/notifications/divine-app-notification'
import { getCanonicalUrl } from '@/lib/site-url'
import { FANSLY_LOGO_SRC, ONLYFANS_LOGO_SRC } from '@/lib/platform-logos'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export type PlatformNotifyKind = 'onlyfans' | 'fansly'

const DISPLAY: Record<PlatformNotifyKind, { name: string; logoUrl: () => string }> = {
  onlyfans: { name: 'OnlyFans', logoUrl: () => getCanonicalUrl(ONLYFANS_LOGO_SRC) },
  fansly: { name: 'Fansly', logoUrl: () => getCanonicalUrl(FANSLY_LOGO_SRC) },
}

function buildEmailHtml(params: {
  platform: PlatformNotifyKind
  event: 'connected' | 'disconnected'
  handleLabel?: string | null
}): string {
  const meta = DISPLAY[params.platform]
  const integrationsUrl = getCanonicalUrl('/dashboard/settings?tab=integrations')
  const title =
    params.event === 'connected'
      ? `${meta.name} connected`
      : `${meta.name} disconnected`
  const sub =
    params.event === 'connected'
      ? `${meta.name} is now linked to your Circe et Venus workspace.`
      : `${meta.name} was removed from your Circe et Venus integrations.`

  const handleLine =
    params.handleLabel?.trim()?.length ?
      `<p style="margin:14px 0 0;font-size:15px;line-height:22px;color:#6e6e73;font-family:'DM Sans',-apple-system,sans-serif;">@${escapeHtml(params.handleLabel.trim())}</p>`
      : ''

  const logoAlt = `${meta.name} logo`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;background-color:#f5f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f7" style="background-color:#f5f5f7;">
<tr><td align="center" style="padding:52px 20px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="600" style="width:100%;max-width:600px;border-collapse:separate;">
<tr><td bgcolor="#ffffff" style="border-radius:22px;border:1px solid #d8d8dd;background-color:#ffffff;box-shadow:0 6px 20px rgba(0,0,0,0.04);overflow:hidden;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#5c4dbf" style="height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr></table>
<table width="100%"><tr><td style="padding:36px 40px 8px;"><img src="${meta.logoUrl()}" alt="${logoAlt}" style="display:block;height:36px;width:auto;max-width:140px;border:0;object-fit:contain;" /></td></tr>
<tr><td style="padding:14px 40px 16px;"><h1 style="margin:0;font-family:'Times New Roman',Georgia,serif;font-size:23px;line-height:1.12;font-weight:600;color:#1d1d1f;">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:0 40px 20px;font-size:17px;line-height:26px;color:#494949;font-family:'DM Sans',-apple-system,sans-serif;">${escapeHtml(sub)}</td></tr>
${handleLine ? `<tr><td style="padding:0 40px 24px">${handleLine}</td></tr>` : ''}
<tr><td style="padding:8px 40px 38px;text-align:center;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
<td bgcolor="#1d1d1f" style="border-radius:999px;background-color:#1d1d1f;"><a href="${integrationsUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:'DM Sans',-apple-system,sans-serif;border-radius:999px;">Open integrations</a></td>
</tr></table>
</td></tr>
<tr><td style="padding:0 40px 38px;"><p style="margin:0;font-size:12px;line-height:18px;color:#86868b;">Circe et Venus · Integrations notification</p></td></tr>
</table>
</td></tr>
</table></td></tr>
</table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Divine in-app notification + optional Resend email when OnlyFans/Fansly connect or disconnect from Settings.
 * Not related to Supabase Auth “identity linked” (OAuth SSO).
 */
export async function notifyPlatformConnectionChange(params: {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  platform: PlatformNotifyKind
  event: 'connected' | 'disconnected'
  /** @username-ish label from platform_connections.platform_username where available */
  platformUsername?: string | null
}): Promise<void> {
  const { platform, event, platformUsername, userId } = params
  const meta = DISPLAY[platform]
  const handle = platformUsername?.trim() || ''

  const title = `${meta.name} ${event === 'connected' ? 'connected' : 'disconnected'}`
  const descriptionRaw =
    event === 'connected'
      ? handle.length > 0
        ? `@${handle} linked in Integrations.`
        : `${meta.name} linked in Integrations.`
      : handle.length > 0
          ? `@${handle} removed from Integrations.`
          : `${meta.name} removed from Integrations.`
  const description = descriptionRaw.slice(0, 2000)

  await insertDivineAppNotification(supabaseAdapter(params.supabase), userId, {
    type: 'system',
    title,
    description,
    link: '/dashboard/settings?tab=integrations',
    platform: platform === 'onlyfans' ? 'onlyfans' : 'fansly',
    metadata: {
      kind: 'platform_connection',
      platform,
      event,
      platformUsername: handle || null,
    },
  })

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL || 'Circe et Venus <support@circe-venus.com>'
  if (!apiKey) return

  let to = params.userEmail?.trim()
  if (!to?.includes('@')) {
    const { data: profile } = await params.supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle()
    to = typeof profile?.email === 'string' ? profile.email.trim() : ''
  }
  if (!to?.includes('@')) return

  const emailTitle =
    event === 'connected'
      ? `${meta.name} connected — Circe et Venus`
      : `${meta.name} disconnected — Circe et Venus`

  const textLines = [
    emailTitle.replace(' — Circe et Venus', ''),
    '',
    meta.name +
      (event === 'connected' ? ' was linked to your Circe et Venus integrations.' : ' was removed from your Circe et Venus integrations.'),
    handle.length > 0 ? `Account: @${handle}` : '',
    '',
    `Manage: ${getCanonicalUrl('/dashboard/settings?tab=integrations')}`,
    '',
    'Did not make this change? Contact support@circeetvenus.com',
  ]
    .filter((x) => x.length > 0)
    .join('\n')

  const html = buildEmailHtml({ platform, event, handleLabel: platformUsername ?? undefined })

  try {
    await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: emailTitle,
        text: textLines,
        html,
      }),
    })
  } catch (e) {
    console.warn('[notifyPlatformConnectionChange]', e instanceof Error ? e.message : e)
  }
}

/** Minimal adapter for insert notifications table */
function supabaseAdapter(supabase: unknown): NotificationInsertClient {
  return supabase as NotificationInsertClient
}
