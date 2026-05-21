import { lookup } from 'node:dns/promises'

const TAIL_BYTES_DEFAULT = 8 * 1024 * 1024

function isPrivateOrReservedIpv4(parts: number[]): boolean {
  const [a, b] = parts
  if (a === 127 || a === 0) return true
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true
  return false
}

function isBlockedIpLiteral(ip: string): boolean {
  if (ip.includes(':')) {
    const lc = ip.toLowerCase()
    if (lc === '::1') return true
    if (lc.startsWith('fe80:')) return true
    if (lc.startsWith('fc') || lc.startsWith('fd')) return true
    return false
  }
  const parts = ip.split('.').map((x) => Number.parseInt(x, 10))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true
  return isPrivateOrReservedIpv4(parts)
}

/**
 * Only http(s). Hostname must resolve to a public IP (best-effort SSRF guard for leak-sourced fetches).
 */
export async function assertUrlSafeForServerFetch(
  urlStr: string,
): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  let u: URL
  try {
    u = new URL(urlStr)
  } catch {
    return { ok: false, error: 'Invalid URL' }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Only http(s) is allowed' }
  }
  const host = u.hostname
  if (!host || host === 'localhost') return { ok: false, error: 'Host not allowed' }
  if (host.endsWith('.localhost') || host.endsWith('.local')) return { ok: false, error: 'Host not allowed' }
  if (netIsNumericIp(host)) {
    if (isBlockedIpLiteral(host)) return { ok: false, error: 'Address not allowed' }
    return { ok: true, href: u.toString() }
  }
  try {
    const r = await lookup(host)
    if (isBlockedIpLiteral(r.address)) {
      return { ok: false, error: 'Host resolves to a disallowed address' }
    }
  } catch {
    return { ok: false, error: 'Could not resolve host' }
  }
  return { ok: true, href: u.toString() }
}

function netIsNumericIp(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) || s.includes(':')
}

/**
 * Re-check the final response URL after redirects.
 */
export async function assertResponseUrlSafe(finalUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return assertUrlSafeForServerFetch(finalUrl)
}

/**
 * Download up to `maxBytes`, optionally trying a Range tail request first (for append-v1 at EOF).
 */
export async function fetchBinaryWithSizeCap(
  href: string,
  maxBytes: number,
  tailFirstBytes: number = TAIL_BYTES_DEFAULT,
): Promise<{ buffer: Buffer; usedRangeTail: boolean; finalUrl: string }> {
  const safe = await assertUrlSafeForServerFetch(href)
  if (!safe.ok) throw new Error(safe.error)

  if (tailFirstBytes > 0) {
    const r = await fetch(href, {
      headers: { Range: `bytes=-${Math.min(tailFirstBytes, maxBytes)}` },
      redirect: 'follow',
    })
    const finalCheck = await assertUrlSafeForServerFetch(r.url)
    if (!finalCheck.ok) throw new Error('Redirect to disallowed URL')
    if (r.ok || r.status === 206) {
      const ab = await r.arrayBuffer()
      let buf = Buffer.from(ab)
      if (buf.length > maxBytes) {
        buf = buf.subarray(buf.length - maxBytes)
      }
      if (buf.length > 0) {
        return { buffer: buf, usedRangeTail: r.status === 206, finalUrl: r.url }
      }
    }
  }

  const r = await fetch(href, { redirect: 'follow' })
  const finalCheck = await assertUrlSafeForServerFetch(r.url)
  if (!finalCheck.ok) throw new Error('Redirect to disallowed URL')
  if (!r.ok) throw new Error(`Download failed: HTTP ${r.status}`)
  const reader = r.body?.getReader()
  const chunks: Buffer[] = []
  let total = 0
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value && total < maxBytes) {
        const take = Math.min(value.length, maxBytes - total)
        chunks.push(Buffer.from(value.subarray(0, take)))
        total += take
        if (total >= maxBytes) {
          try {
            await reader.cancel()
          } catch {
            // ignore
          }
          break
        }
      }
    }
  } else {
    const ab = await r.arrayBuffer()
    chunks.push(Buffer.from(ab).subarray(0, maxBytes))
  }
  return { buffer: Buffer.concat(chunks), usedRangeTail: false, finalUrl: r.url }
}
