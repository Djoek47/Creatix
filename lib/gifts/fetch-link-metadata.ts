/**
 * SSRF-safe HTTPS fetch + light HTML parsing for og tags / JSON-LD Product.
 */

export type FetchMetadataResult =
  | {
      ok: true
      title: string | null
      description: string | null
      imageUrl: string | null
      priceAmount: number | null
      priceCurrency: string | null
    }
  | { ok: false; error: string }

const MAX_BYTES = 500_000
const TIMEOUT_MS = 8_000
const MAX_REDIRECTS = 4

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h.includes(':')) return true

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (ipv4) {
    const a = Number(ipv4[1])
    const b = Number(ipv4[2])
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }
  return false
}

export function assertSafeHttpsUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:') return null
    if (!u.hostname || isBlockedHostname(u.hostname)) return null
    if (u.username || u.password) return null
    return u
  } catch {
    return null
  }
}

function metaOg(html: string, prop: string): string | null {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re1 = new RegExp(
    `<meta[^>]+property=["']${esc}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  const m1 = html.match(re1)
  if (m1?.[1]) return decodeBasicEntities(m1[1].trim()) || null
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${esc}["']`,
    'i',
  )
  const m2 = html.match(re2)
  if (m2?.[1]) return decodeBasicEntities(m2[1].trim()) || null
  return null
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,500})<\/title>/i)
  return m?.[1] ? decodeBasicEntities(m[1].trim()) : null
}

function tryJsonLdProduct(html: string): { price?: number; currency?: string } {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const s of scripts) {
    const raw = s[1]?.trim()
    if (!raw) continue
    try {
      const data = JSON.parse(raw) as unknown
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const types = [o['@type'], o.type].flat().filter(Boolean).map(String)
        const isProduct = types.some((t) => /product/i.test(t))
        if (!isProduct) continue
        const offers = o.offers
        const offer = Array.isArray(offers) ? offers[0] : offers
        if (offer && typeof offer === 'object') {
          const off = offer as Record<string, unknown>
          const priceRaw = off.price ?? off.lowPrice
          const price =
            typeof priceRaw === 'number'
              ? priceRaw
              : typeof priceRaw === 'string'
                ? parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
                : NaN
          const cur = typeof off.priceCurrency === 'string' ? off.priceCurrency : undefined
          if (!Number.isNaN(price) && price > 0) {
            return { price, currency: cur }
          }
        }
      }
    } catch {
      // ignore bad JSON
    }
  }
  return {}
}

function parseHtmlMetadata(html: string): FetchMetadataResult {
  const title = metaOg(html, 'og:title') || titleTag(html)
  const description = metaOg(html, 'og:description') || metaOg(html, 'description')
  let imageUrl = metaOg(html, 'og:image')
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) imageUrl = null
  const ld = tryJsonLdProduct(html)
  return {
    ok: true,
    title: title || null,
    description: description || null,
    imageUrl: imageUrl || null,
    priceAmount: ld.price ?? null,
    priceCurrency: ld.currency ?? null,
  }
}

export async function fetchLinkMetadata(urlString: string): Promise<FetchMetadataResult> {
  let current = assertSafeHttpsUrl(urlString)
  if (!current) return { ok: false, error: 'Invalid or disallowed URL (HTTPS only).' }

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent':
            'Mozilla/5.0 (compatible; CreatixGiftBot/1.0; +https://www.circeetvenus.com)',
        },
      })
    } catch (e) {
      clearTimeout(timer)
      const msg = e instanceof Error ? e.message : 'Fetch failed'
      return { ok: false, error: msg.includes('abort') ? 'Request timed out' : msg }
    }
    clearTimeout(timer)

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return { ok: false, error: 'Redirect without Location header' }
      let next: URL
      try {
        next = new URL(loc, current.toString())
      } catch {
        return { ok: false, error: 'Invalid redirect URL' }
      }
      if (next.protocol !== 'https:') return { ok: false, error: 'Non-HTTPS redirect blocked' }
      if (isBlockedHostname(next.hostname)) return { ok: false, error: 'Redirect to disallowed host' }
      current = next
      continue
    }

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

    const reader = res.body?.getReader()
    if (!reader) return { ok: false, error: 'Empty response body' }

    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.byteLength
        if (total > MAX_BYTES) {
          await reader.cancel()
          return { ok: false, error: 'Response too large' }
        }
        chunks.push(value)
      }
    }

    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    const html = buf.toString('utf8', 0, Math.min(buf.length, MAX_BYTES))
    return parseHtmlMetadata(html)
  }

  return { ok: false, error: 'Too many redirects' }
}
