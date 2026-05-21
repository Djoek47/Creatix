import { inferMediaTypeFromUrl } from '@/lib/leaks/canonical-dedupe'

/** Normalize URL or bare tokens (subdomains accepted) into host-snippet needles. */
export function normalizeDiscoveryHostNeedles(raw: unknown[] | undefined): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    let s = typeof item === 'string' ? item.trim() : ''
    if (!s) continue
    try {
      if (s.includes('://') || /^[\w.-]+\.[a-z]{2,}/i.test(s)) {
        const h = new URL(s.startsWith('http') ? s : `https://${s}`).hostname.toLowerCase()
        const noWww = h.startsWith('www.') ? h.slice(4) : h
        s = noWww.split('.')[0] || noWww
      }
    } catch {
      s = s.toLowerCase().replace(/^www\./, '')
    }
    const key = s.slice(0, 120).toLowerCase().trim()
    if (key.length < 2) continue
    if (!seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
    if (out.length >= 20) break
  }
  return out
}

export function matchesDiscoveryFocus(
  urlStr: string,
  hostNeedles: string[],
  media: 'video' | 'photo' | undefined,
): boolean {
  let hostOk = hostNeedles.length === 0
  try {
    const host = new URL(urlStr).hostname.toLowerCase()
    const noWww = host.startsWith('www.') ? host.slice(4) : host
    if (hostNeedles.length > 0) {
      hostOk = hostNeedles.some((n) => n.length > 0 && (noWww.includes(n.toLowerCase()) || host.includes(n.toLowerCase())))
    }
  } catch {
    hostOk = hostNeedles.length === 0
  }
  if (!hostOk) return false
  if (!media) return true
  return inferMediaTypeFromUrl(urlStr) === media
}
