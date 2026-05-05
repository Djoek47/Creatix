import { getAppUrl } from '@/lib/site-url'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Public site origin for absolute URLs inside Resend HTML (logo, links).
 * Set `EMAIL_PUBLIC_SITE_URL` when `APP_URL` on the server is not the customer-facing domain
 * (e.g. preview URLs, misconfigured env) so images and CTAs resolve correctly in inboxes.
 */
export function getEmailPublicOrigin(): string {
  const raw = process.env.EMAIL_PUBLIC_SITE_URL?.trim()
  if (raw) return stripTrailingSlash(raw)
  return getAppUrl()
}

export function emailAbsoluteUrl(path: string): string {
  const base = getEmailPublicOrigin()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Header mark in transactional templates. Prefer `EMAIL_BRAND_LOGO_URL` (full https URL) for a CDN
 * or verified static host; else `EMAIL_BRAND_LOGO_PATH` under the public site (default `/icon.png`).
 */
export function emailBrandLogoUrl(): string {
  const absolute = process.env.EMAIL_BRAND_LOGO_URL?.trim()
  if (absolute && /^https?:\/\//i.test(absolute)) return absolute
  const path = process.env.EMAIL_BRAND_LOGO_PATH?.trim() || '/icon.png'
  return emailAbsoluteUrl(path.startsWith('/') ? path : `/${path}`)
}
