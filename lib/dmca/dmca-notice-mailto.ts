/** Conservative cap so common mail apps accept the `mailto:` URI. */
const MAX_MAILTO_HREF_LENGTH = 1900

const TRUNCATION_FOOTER =
  '\n\n[Draft shortened for your mail app — copy the full notice from Creatix if needed.]'

const FALLBACK_BODY =
  '[Open Creatix → Protection and copy your full DMCA draft here; this host contact was too long or unknown.]'

/**
 * Builds a `mailto:` href with subject + body. Truncates body (with footer) when the URL exceeds safe length.
 *
 * Uses `mailto:` with no recipient when {@link params.to} is omitted — the user's client opens compose and they paste the host address manually.
 */
export function buildDmcaNoticeMailtoHref(params: {
  to?: string | null
  subject?: string
  body: string
}): string {
  const subject = (params.subject ?? 'DMCA Takedown Notice').trim() || 'DMCA Takedown Notice'
  const rawTo = params.to?.trim()
  /** Unencoded local `mailto:user@host` fragment (URLSearchParams encodes query keys/values only). */
  const prefix = rawTo ? `mailto:${rawTo}` : 'mailto:'

  const assemble = (body: string): string => {
    const q = new URLSearchParams()
    q.set('subject', subject)
    q.set('body', body)
    return `${prefix}?${q.toString()}`
  }

  let body = params.body
  let href = assemble(body)
  if (href.length <= MAX_MAILTO_HREF_LENGTH) return href

  /** Largest prefix length such that body + footer fits in client limits. */
  let best = 0
  let lo = 0
  let hi = body.length
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const cand = body.slice(0, mid) + TRUNCATION_FOOTER
    const h = assemble(cand)
    if (h.length <= MAX_MAILTO_HREF_LENGTH) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  href = assemble(body.slice(0, best) + TRUNCATION_FOOTER)
  if (href.length <= MAX_MAILTO_HREF_LENGTH) return href

  const minimal = assemble(FALLBACK_BODY)
  if (minimal.length <= MAX_MAILTO_HREF_LENGTH) return minimal

  /** Last resort: subject only — shouldn't happen unless subject itself is absurdly long */
  const subOnly = new URLSearchParams()
  subOnly.set('subject', subject)
  const last = `${prefix}?${subOnly.toString()}`
  return last.length <= MAX_MAILTO_HREF_LENGTH
    ? last
    : 'mailto:'
}
