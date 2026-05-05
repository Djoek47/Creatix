import { SUPPORT_EMAIL } from '@/components/marketing/footer-support-social'
import { getCanonicalUrl } from '@/lib/site-url'

/**
 * Transactional welcome — aligns with docs/STYLE.md (gold + Circe purple, DM Sans + Cinzel, calm voice).
 */
export function buildWelcomeEmailContent(params: {
  /** First name or short greeting token */
  greetingName: string
}): { subject: string; text: string; html: string } {
  const dashboardUrl = getCanonicalUrl('/dashboard')
  const settingsUrl = getCanonicalUrl('/dashboard/settings?tab=integrations')
  const memberSupportUrl = getCanonicalUrl('/contact')
  const mailtoSupport = `mailto:${SUPPORT_EMAIL}`

  const subject = 'Welcome to Circe et Venus'

  const text = [
    `Hi ${params.greetingName},`,
    '',
    'Your account is ready. Creatix is your workspace for creators on OnlyFans and Fansly — messaging, media, insights, and tools in one calm surface.',
    '',
    `Open your dashboard: ${dashboardUrl}`,
    '',
    `Connect a platform when you are ready: ${settingsUrl}`,
    '',
    `Questions? Write us at ${SUPPORT_EMAIL} — or use in-app member support after you subscribe: ${memberSupportUrl}`,
    '',
    '— Circe et Venus',
  ].join('\n')

  const nameEsc = escapeHtml(params.greetingName)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;background-color:#f7f6f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f6f3;">
    <tr>
      <td align="center" style="padding:48px 20px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" style="max-width:560px;border-collapse:separate;">
          <tr>
            <td style="border-radius:20px;background-color:#ffffff;border:1px solid #e8e6e1;overflow:hidden;box-shadow:0 8px 28px rgba(41,36,56,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:3px;line-height:3px;font-size:0;background:linear-gradient(90deg,#5c4dbf,#c9a227);">&nbsp;</td>
                </tr>
              </table>
              <table width="100%"><tr><td style="padding:36px 36px 8px;">
                <p style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:26px;font-weight:600;line-height:1.15;letter-spacing:-0.02em;color:#1f1a2e;">
                  You&apos;re in.
                </p>
              </td></tr>
              <tr><td style="padding:8px 36px 0;font-size:17px;line-height:1.55;color:#3d3848;">
                <p style="margin:0 0 16px;">Hi ${nameEsc},</p>
                <p style="margin:0 0 16px;">Your account is ready. <strong>Creatix</strong> is your workspace for creators on OnlyFans and Fansly — messaging, media, insights, and tools in one calm surface.</p>
              </td></tr>
              <tr><td style="padding:28px 36px 8px;text-align:center;">
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td style="border-radius:999px;background-color:#b8952e;">
                      <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:'DM Sans',-apple-system,sans-serif;border-radius:999px;">
                        Open dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:12px 36px 32px;font-size:15px;line-height:1.55;color:#5c5766;">
                <p style="margin:0;">When you are ready, connect a platform under <a href="${settingsUrl}" style="color:#5c4dbf;font-weight:500;text-decoration:none;border-bottom:1px solid rgba(92,79,191,0.35);">Settings → Integrations</a>.</p>
                <p style="margin:16px 0 0;">Questions? <a href="${mailtoSupport}" style="color:#5c4dbf;font-weight:500;text-decoration:none;border-bottom:1px solid rgba(92,79,191,0.35);">${escapeHtml(SUPPORT_EMAIL)}</a> — or <a href="${memberSupportUrl}" style="color:#5c4dbf;font-weight:500;text-decoration:none;border-bottom:1px solid rgba(92,79,191,0.35);">member support</a> in the app once you are subscribed.</p>
              </td></tr>
              <tr><td style="padding:0 36px 36px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8494;">Circe et Venus · Mythology-meets-creator platform</p>
              </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
