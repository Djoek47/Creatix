import { SITE_NAME } from '@/lib/seo/marketing-metadata'

/**
 * Canonical English SERP titles: `{primary} | {SITE_NAME}`.
 * Skip transformation if `primary` already includes `|` (custom format).
 */
export function withSiteNameTitle(primary: string, siteName: string = SITE_NAME): string {
  const t = primary.trim()
  if (t.includes('|')) return t
  return `${t} | ${siteName}`
}
