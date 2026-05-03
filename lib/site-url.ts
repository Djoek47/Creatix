import type { NextRequest } from 'next/server'

const FALLBACK_PUBLIC_URL = 'https://www.circeetvenus.com'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Canonical public origin used for metadata/sitemaps/OAuth/webhook docs.
 * Crawlable URLs for sitemaps / robots are defined in {@link ./seo-public-paths};
 * indexed marketing canonicals use `/en/…`; `/dashboard` is private.
 *
 * Precedence:
 * - APP_URL (server-only, preferred)
 * - NEXT_PUBLIC_APP_URL (shared runtime fallback)
 * - hardcoded canonical fallback
 */
export function getAppUrl(): string {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || FALLBACK_PUBLIC_URL
  return stripTrailingSlash(raw)
}

/**
 * Origin for links returned to the client that must match the tab the user is on
 * (e.g. Frame `importUrl`, vault asset proxy). Uses `Host` / `X-Forwarded-*` from the
 * request so a session on `www.circeetvenus.com` does not embed `circe-venus.vercel.app`
 * URLs when env still points at the default Vercel hostname (or the reverse).
 */
export function getAppUrlFromRequest(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.trim()
  if (!host) {
    return getAppUrl()
  }
  const protoHeader = request.headers.get('x-forwarded-proto')?.trim()
  const isLocal =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]')
  const proto = protoHeader || (isLocal ? 'http' : 'https')
  return stripTrailingSlash(`${proto}://${host}`)
}

export function getCanonicalHost(): string {
  try {
    return new URL(getAppUrl()).host
  } catch {
    return new URL(FALLBACK_PUBLIC_URL).host
  }
}

export function getCanonicalUrl(path: string): string {
  const base = getAppUrl()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
