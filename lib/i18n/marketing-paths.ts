/**
 * Paths that historically lived at "/" without a locale segment and should redirect to `/[locale]/…`.
 */

const MARKETING_SEGMENTS = new Set([
  '',
  'features',
  'demo',
  'mobile-app',
  'pricing',
  'how-it-works',
  'launch-list',
])

export function isBareMarketingPath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  if (trimmed === '/') return true
  if (!trimmed.startsWith('/') || trimmed.slice(1).includes('/')) return false
  const seg = trimmed.slice(1).toLowerCase()
  return MARKETING_SEGMENTS.has(seg)
}
