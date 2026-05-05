import { SUPPORT_EMAIL } from '@/components/marketing/footer-support-social'
import { getCanonicalUrl } from '@/lib/site-url'

/**
 * Luxury welcome letter — docs/STYLE.md.
 * Light: Venus (cream, gold, purple). Dark: Circe (near-black, brighter gold, luminous purple) via
 * `prefers-color-scheme: dark` and `[data-ogsc]` (some Gmail/Outlook clients).
 */
export function buildWelcomeEmailContent(params: {
  greetingName: string
}): { subject: string; text: string; html: string } {
  const dashboardUrl = getCanonicalUrl('/dashboard')
  const settingsUrl = getCanonicalUrl('/dashboard/settings?tab=integrations')
  const memberSupportUrl = getCanonicalUrl('/contact')
  const mailtoSupport = `mailto:${SUPPORT_EMAIL}`
  const logoUrl = getCanonicalUrl('/icon.png')

  const subject = 'Welcome to Circe et Venus'

  const text = [
    `Hi ${params.greetingName},`,
    '',
    'Welcome to Circe et Venus — Creatix is your operating system for creators on OnlyFans and Fansly.',
    '',
    'Clarity — One calm surface for messages, media, and the signals that matter.',
    'Control — Connect a platform when you choose; your workspace stays organized around you.',
    'Intelligence — Tools that stay quiet until you need them.',
    '',
    `Open your workspace: ${dashboardUrl}`,
    `Integrations: ${settingsUrl}`,
    '',
    `Questions: ${SUPPORT_EMAIL} — member support (subscribers): ${memberSupportUrl}`,
    '',
    'Circe et Venus',
  ].join('\n')

  const nameEsc = escapeHtml(params.greetingName)
  const preheader =
    'Your workspace is ready — clarity, control, and intelligence in one refined surface.'

  const darkModeCss = `
    @media (prefers-color-scheme: dark) {
      .cev-body-bg { background-color: #0c0b10 !important; }
      .cev-wrap-bg { background-color: #0c0b10 !important; }
      .cev-card {
        background-color: #13111a !important;
        border-color: #2a2635 !important;
        box-shadow: none !important;
      }
      .cev-top-purple { background-color: #7c6bb8 !important; }
      .cev-top-gold { background-color: #d4b24c !important; }
      .cev-hairline { background-color: #2a2635 !important; }
      .cev-logo-ring { border-color: rgba(255,255,255,0.1) !important; }
      .cev-wordmark { color: #c9b8f0 !important; }
      .cev-hero-title { color: #f2f0f7 !important; }
      .cev-hero-body { color: #b4afc9 !important; }
      .cev-hero-strong { color: #ebe9f4 !important; }
      .cev-module-table { background-color: #1a1724 !important; border-color: #2a2635 !important; }
      .cev-module-label { color: #b0a0dc !important; }
      .cev-module-text { color: #c6c2d8 !important; }
      .cev-module-strong { color: #f0eef8 !important; }
      .cev-btn { background-color: #d4b352 !important; border-color: #e0c266 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.35) !important; }
      .cev-btn-text { color: #141218 !important; }
      .cev-cta-sub { color: #908aa3 !important; }
      .cev-link { color: #c9b8f0 !important; border-bottom-color: rgba(201,184,240,0.45) !important; }
      .cev-footer-muted { color: #8f8aa1 !important; }
      .cev-footer-sep { color: #4a4558 !important; }
      .cev-footer-fine { color: #6d687e !important; }
    }
    [data-ogsc] .cev-body-bg, [data-ogsb] .cev-body-bg { background-color: #0c0b10 !important; }
    [data-ogsc] .cev-wrap-bg, [data-ogsb] .cev-wrap-bg { background-color: #0c0b10 !important; }
    [data-ogsc] .cev-card, [data-ogsb] .cev-card {
      background-color: #13111a !important;
      border-color: #2a2635 !important;
      box-shadow: none !important;
    }
    [data-ogsc] .cev-hairline, [data-ogsb] .cev-hairline { background-color: #2a2635 !important; }
    [data-ogsc] .cev-wordmark, [data-ogsb] .cev-wordmark { color: #c9b8f0 !important; }
    [data-ogsc] .cev-hero-title, [data-ogsb] .cev-hero-title { color: #f2f0f7 !important; }
    [data-ogsc] .cev-hero-body, [data-ogsb] .cev-hero-body { color: #b4afc9 !important; }
    [data-ogsc] .cev-hero-strong, [data-ogsb] .cev-hero-strong { color: #ebe9f4 !important; }
    [data-ogsc] .cev-module-table, [data-ogsb] .cev-module-table {
      background-color: #1a1724 !important;
      border-color: #2a2635 !important;
    }
    [data-ogsc] .cev-module-label, [data-ogsb] .cev-module-label { color: #b0a0dc !important; }
    [data-ogsc] .cev-module-text, [data-ogsb] .cev-module-text { color: #c6c2d8 !important; }
    [data-ogsc] .cev-module-strong, [data-ogsb] .cev-module-strong { color: #f0eef8 !important; }
    [data-ogsc] .cev-btn, [data-ogsb] .cev-btn { background-color: #d4b352 !important; border-color: #e0c266 !important; }
    [data-ogsc] .cev-btn-text, [data-ogsb] .cev-btn-text { color: #141218 !important; }
    [data-ogsc] .cev-cta-sub, [data-ogsb] .cev-cta-sub { color: #908aa3 !important; }
    [data-ogsc] .cev-link, [data-ogsb] .cev-link { color: #c9b8f0 !important; }
    [data-ogsc] .cev-footer-muted, [data-ogsb] .cev-footer-muted { color: #8f8aa1 !important; }
    [data-ogsc] .cev-footer-sep, [data-ogsb] .cev-footer-sep { color: #4a4558 !important; }
    [data-ogsc] .cev-footer-fine, [data-ogsb] .cev-footer-fine { color: #6d687e !important; }
    [data-ogsc] .cev-logo-ring, [data-ogsb] .cev-logo-ring { border-color: rgba(255,255,255,0.1) !important; }
  `

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap" rel="stylesheet" />
  <style type="text/css">
    :root { color-scheme: light dark; }
    @media only screen and (max-width: 620px) {
      .cev-pad { padding-left: 28px !important; padding-right: 28px !important; }
      .cev-hero-title { font-size: 28px !important; }
    }
    ${darkModeCss}
  </style>
</head>
<body class="cev-body-bg" style="margin:0;padding:0;background-color:#f3f1ec;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" class="cev-wrap-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f1ec;">
    <tr>
      <td align="center" style="padding:56px 24px 72px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td class="cev-pad cev-card" style="padding:0;border-radius:2px;background-color:#faf9f6;border:1px solid #e8e4dc;box-shadow:0 1px 0 rgba(26,22,37,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="cev-top-purple" style="width:36%;height:1px;line-height:1px;font-size:0;background-color:#5c4d8a;">&nbsp;</td>
                  <td class="cev-top-gold" style="width:28%;height:1px;line-height:1px;font-size:0;background-color:#c9a84c;">&nbsp;</td>
                  <td class="cev-top-purple" style="width:36%;height:1px;line-height:1px;font-size:0;background-color:#5c4d8a;">&nbsp;</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:48px 40px 32px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <img class="cev-logo-ring" src="${logoUrl}" width="80" height="80" alt="Circe et Venus" style="display:block;width:80px;height:80px;border-radius:40px;border:1px solid rgba(26,22,37,0.06);" />
                    <p class="cev-wordmark" style="margin:20px 0 0;font-family:'Cinzel',Georgia,'Times New Roman',serif;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#5c4d8a;">Circe et Venus</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 48px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td class="cev-hairline" style="height:1px;background-color:#e3ded4;line-height:1px;font-size:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="cev-pad" align="center" style="padding:40px 48px 8px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <h1 class="cev-hero-title" style="margin:0;font-family:'Cinzel',Georgia,'Times New Roman',serif;font-size:32px;font-weight:600;line-height:1.12;letter-spacing:-0.03em;color:#1a1626;">A quiet welcome</h1>
                    <p class="cev-hero-body" style="margin:20px 0 0;max-width:420px;font-size:16px;line-height:1.65;font-weight:400;color:#4a4558;">Hi ${nameEsc} — your account is ready. <strong class="cev-hero-strong" style="font-weight:600;color:#2a2438;">Creatix</strong> is the luxury operating system for creators: messaging, media, insight, and automation in one composed workspace.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="cev-pad" style="padding:28px 40px 12px;">
                    <table class="cev-module-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e4dc;border-radius:2px;background-color:#ffffff;">
                      <tr>
                        <td style="padding:22px 24px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                          <p class="cev-module-label" style="margin:0 0 6px;font-family:'Cinzel',Georgia,serif;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#8a7ab8;">Clarity</p>
                          <p class="cev-module-text" style="margin:0;font-size:15px;line-height:1.6;color:#3f3a4d;">One surface for conversations, vault, and the revenue signals you actually use — no clutter, no noise.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="cev-pad" style="padding:12px 40px 12px;">
                    <table class="cev-module-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e4dc;border-radius:2px;background-color:#ffffff;">
                      <tr>
                        <td style="padding:22px 24px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                          <p class="cev-module-label" style="margin:0 0 6px;font-family:'Cinzel',Georgia,serif;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#8a7ab8;">Control</p>
                          <p class="cev-module-text" style="margin:0;font-size:15px;line-height:1.6;color:#3f3a4d;">Connect <strong class="cev-module-strong" style="font-weight:600;color:#2a2438;">OnlyFans</strong> or <strong class="cev-module-strong" style="font-weight:600;color:#2a2438;">Fansly</strong> when you decide. Your integrations, your cadence.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="cev-pad" style="padding:12px 40px 36px;">
                    <table class="cev-module-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e4dc;border-radius:2px;background-color:#ffffff;">
                      <tr>
                        <td style="padding:22px 24px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                          <p class="cev-module-label" style="margin:0 0 6px;font-family:'Cinzel',Georgia,serif;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#8a7ab8;">Intelligence</p>
                          <p class="cev-module-text" style="margin:0;font-size:15px;line-height:1.6;color:#3f3a4d;">AI that stays in the background — present when you need it, invisible when you don&apos;t.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:8px 40px 44px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td class="cev-btn" style="border-radius:10px;background-color:#b8952e;border:1px solid #a68528;box-shadow:0 1px 2px rgba(26,22,37,0.06);">
                          <a class="cev-btn-text" href="${dashboardUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 36px;font-size:14px;font-weight:600;letter-spacing:0.04em;color:#faf9f6;text-decoration:none;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Enter your workspace</a>
                        </td>
                      </tr>
                    </table>
                    <p class="cev-cta-sub" style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6b6578;">Prefer to connect first? <a class="cev-link" href="${settingsUrl}" style="color:#5c4d8a;text-decoration:none;border-bottom:1px solid rgba(92,77,138,0.35);font-weight:500;">Settings → Integrations</a></p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 48px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td class="cev-hairline" style="height:1px;background-color:#e3ded4;line-height:1px;font-size:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="cev-pad" style="padding:28px 40px 40px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <p class="cev-footer-muted" style="margin:0;font-size:12px;line-height:1.65;color:#8c8699;text-align:center;">Questions — <a class="cev-link" href="${mailtoSupport}" style="color:#5c4d8a;text-decoration:none;border-bottom:1px solid rgba(92,77,138,0.3);">${escapeHtml(SUPPORT_EMAIL)}</a><span class="cev-footer-sep" style="color:#c9c4d1;"> · </span><a class="cev-link" href="${memberSupportUrl}" style="color:#5c4d8a;text-decoration:none;border-bottom:1px solid rgba(92,77,138,0.3);">Member support</a> <span class="cev-footer-fine" style="color:#8c8699;">(subscribers)</span></p>
                    <p class="cev-footer-fine" style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#a8a3b3;text-align:center;letter-spacing:0.06em;">CIRCE ET VENUS · CREATIX</p>
                  </td>
                </tr>
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
