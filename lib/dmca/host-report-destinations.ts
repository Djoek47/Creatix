/**
 * Resolves where creators can report copyright / abuse to a third-party host.
 *
 * Order:
 * 1. Structured Grok fields: contactUrl (https), contactEmail (mailto)
 * 2. Curated hostname → official copyright / DMCA / abuse entry pages (HTTPS only)
 * 3. First http(s) URL or email parsed from grok.contactHint free text
 * 4. Plain contactHint text for display/copy when nothing else applies
 *
 * Links are convenience pointers only; Creatix does not submit notices for users.
 */

/** Curated public pages — update if hosts change their flows. */
const CURATED_BY_HOST: Array<{ match: (host: string) => boolean; href: string; label: string }> = [
  {
    match: (h) => h === 'reddit.com' || h.endsWith('.reddit.com'),
    href: 'https://www.reddithelp.com/hc/en-us/articles/360043034713-Report-a-Copyright-or-Trademark-Infringement',
    label: 'Reddit copyright report',
  },
  {
    match: (h) => h === 'x.com' || h.endsWith('.x.com') || h === 'twitter.com' || h.endsWith('.twitter.com'),
    href: 'https://help.twitter.com/forms/dmca',
    label: 'X / Twitter DMCA form',
  },
  {
    match: (h) => h === 'instagram.com' || h.endsWith('.instagram.com'),
    href: 'https://help.instagram.com/contact/636276399721841',
    label: 'Instagram copyright report',
  },
  {
    match: (h) => h === 'tiktok.com' || h.endsWith('.tiktok.com'),
    href: 'https://www.tiktok.com/legal/report/Copyright',
    label: 'TikTok copyright report',
  },
  {
    match: (h) => h === 'discord.com' || h.endsWith('.discord.com') || h === 'discord.gg' || h.endsWith('.discord.gg'),
    href: 'https://discord.com/safety/360043361072-Copyright-and-Intellectual-Property',
    label: 'Discord IP / copyright',
  },
  {
    match: (h) => h === 'telegram.org' || h.endsWith('.telegram.org') || h === 't.me' || h.endsWith('.t.me'),
    href: 'https://telegram.org/dmca',
    label: 'Telegram DMCA',
  },
  {
    match: (h) => h === 'cloudflare.com' || h.endsWith('.cloudflare.com'),
    href: 'https://www.cloudflare.com/trust-hub/abuse-form/',
    label: 'Cloudflare abuse form',
  },
  {
    match: (h) => h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be',
    href: 'https://support.google.com/youtube/contact/copyright_infringement',
    label: 'YouTube copyright complaint',
  },
  {
    match: (h) => h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.com' || h.endsWith('.fb.com'),
    href: 'https://www.facebook.com/help/contact/634636770032106',
    label: 'Facebook copyright report',
  },
  {
    match: (h) => h === 'pinterest.com' || h.endsWith('.pinterest.com'),
    href: 'https://policy.pinterest.com/en/copyright-policy',
    label: 'Pinterest copyright policy',
  },
  {
    match: (h) => h === 'onlyfans.com' || h.endsWith('.onlyfans.com'),
    href: 'https://onlyfans.com/help',
    label: 'OnlyFans help / DMCA',
  },
  {
    match: (h) => h === 'google.com' || h.endsWith('.google.com') || h === 'goo.gl',
    href: 'https://support.google.com/legal/troubleshooter/1114905',
    label: 'Google legal troubleshooter',
  },
]

export type HostReportLinkKind = 'url' | 'mailto'

export type HostReportLink = {
  kind: HostReportLinkKind
  href: string
  label: string
  source: 'grok_url' | 'grok_email' | 'curated' | 'hint_url' | 'hint_email'
}

export type HostReportResolution = {
  links: HostReportLink[]
  /** Plain-text hint when no URL/email, or extra context from the scan */
  hintText: string | null
}

function normalizeHost(raw: string): string {
  let h = raw.toLowerCase().trim()
  if (h.startsWith('www.')) h = h.slice(4)
  return h
}

function safeUrl(href: string): string | null {
  try {
    const u = new URL(href)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Non-global regex to avoid lastIndex issues across calls. */
function firstUrlInText(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"')]+/i)
  if (!m?.[0]) return null
  const cleaned = m[0].replace(/[),.;]+$/, '')
  return safeUrl(cleaned)
}

function firstEmailInText(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return m?.[0] ?? null
}

function isPlainEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function canonicalHrefForDedupe(href: string): string {
  try {
    const u = new URL(href)
    u.hash = ''
    return u.href.replace(/\/$/, '')
  } catch {
    return href
  }
}

function parseNotes(notes: string | null): {
  contactHint?: string
  contactUrl?: string
  contactEmail?: string
} {
  if (!notes?.trim()) return {}
  try {
    const j = JSON.parse(notes) as {
      grok?: {
        contactHint?: string
        contactUrl?: string
        contactEmail?: string
      }
    }
    const g = j.grok
    return {
      contactHint: typeof g?.contactHint === 'string' ? g.contactHint : undefined,
      contactUrl: typeof g?.contactUrl === 'string' ? g.contactUrl : undefined,
      contactEmail: typeof g?.contactEmail === 'string' ? g.contactEmail : undefined,
    }
  } catch {
    return {}
  }
}

function curatedForHost(host: string): { href: string; label: string } | null {
  const h = normalizeHost(host)
  for (const row of CURATED_BY_HOST) {
    if (row.match(h)) return { href: row.href, label: row.label }
  }
  return null
}

function pushUnique(
  out: HostReportLink[],
  link: HostReportLink,
  seen: Set<string>,
): void {
  const key = `${link.kind}:${canonicalHrefForDedupe(link.href)}`
  if (seen.has(key)) return
  seen.add(key)
  out.push(link)
}

/**
 * Returns buttons/links to help the user reach the host’s public copyright or abuse channels.
 */
export function getHostReportDestinations(
  sourceUrl: string,
  notes: string | null | undefined,
): HostReportResolution {
  const { contactHint, contactUrl: grokUrl, contactEmail: grokEmail } = parseNotes(notes ?? null)

  const links: HostReportLink[] = []
  const seen = new Set<string>()

  const gu = grokUrl?.trim() ? safeUrl(grokUrl.trim()) : null
  if (gu) {
    pushUnique(
      links,
      { kind: 'url', href: gu, label: 'Open host link (from scan)', source: 'grok_url' },
      seen,
    )
  }

  const ge = grokEmail?.trim()
  if (ge && isPlainEmail(ge)) {
    const email = ge.trim()
    pushUnique(
      links,
      {
        kind: 'mailto',
        href: `mailto:${email}?subject=DMCA%20notice`,
        label: `Email ${email}`,
        source: 'grok_email',
      },
      seen,
    )
  }

  let pageHost = ''
  try {
    pageHost = new URL(sourceUrl).hostname
  } catch {
    pageHost = ''
  }

  if (pageHost) {
    const cur = curatedForHost(pageHost)
    if (cur) {
      const href = safeUrl(cur.href)
      if (href) {
        pushUnique(
          links,
          { kind: 'url', href, label: 'Report to host', source: 'curated' },
          seen,
        )
      }
    }
  }

  if (contactHint?.trim()) {
    const hint = contactHint.trim()
    const parsedUrl = firstUrlInText(hint)
    if (parsedUrl) {
      pushUnique(
        links,
        { kind: 'url', href: parsedUrl, label: 'Open link from scan hint', source: 'hint_url' },
        seen,
      )
    }
    const parsedEmail = firstEmailInText(hint)
    if (parsedEmail && !hint.includes('http')) {
      pushUnique(
        links,
        {
          kind: 'mailto',
          href: `mailto:${parsedEmail}?subject=DMCA%20notice`,
          label: `Email ${parsedEmail}`,
          source: 'hint_email',
        },
        seen,
      )
    }
  }

  let hintText: string | null = null
  if (contactHint?.trim()) {
    const hint = contactHint.trim()
    const u = firstUrlInText(hint)
    const e = firstEmailInText(hint)
    const rest = hint
      .replace(u ?? '', '')
      .replace(e ?? '', '')
      .trim()
      .replace(/^[,;\s]+|[,;\s]+$/g, '')
    const substantive = rest.length > 0
    if (links.length === 0) {
      hintText = hint
    } else if (substantive) {
      hintText = hint
    }
  }

  return { links, hintText }
}
