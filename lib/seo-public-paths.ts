/**
 * Indexing & crawl policy for the public surface (everything before `/dashboard`).
 *
 * ## English-first SEO indexing
 *
 * Locale-prefixed marketing routes canonicalize under `/${SEO_PRIMARY_LOCALE}/…` (see
 * `buildMarketingLocaleMetadata`). The **XML sitemap** lists only those English marketing URLs
 * plus unprefixed legal/trust URLs so crawler signals match canonicals.
 *
 * Other locales (`es`, `fr`, `pt`) remain deployed for UX; their marketing routes use
 * `robots.noindex` in metadata (see `buildMarketingLocaleMetadata`) so consolidated ranking
 * targets English canonicals.
 *
 * ## Auth URLs
 *
 * `/auth/login` and `/auth/sign-up` are crawlable (listed in robots `Allow`) but use layout
 * `robots.noindex` so Login/Sign up rarely appear as indexed landing pages.
 *
 * Signed-in product and APIs are omitted here and blocked via robots `disallow`:
 * `/dashboard`, `/api`, etc.
 */
import type { Phase1Locale } from '@/lib/i18n/routing'

/** Canonical marketing locale listed in `sitemap.xml` and prioritized for SERP indexing. */
export const SEO_PRIMARY_LOCALE: Phase1Locale = 'en'

/**
 * Marketing path segments under `/${SEO_PRIMARY_LOCALE}/…`.
 * Empty string → locale marketing home (`/en`).
 *
 * Align with middleware bare-path rewrite segments in {@link '@/lib/i18n/marketing-paths'}.
 */
export const SEO_MARKETING_SEGMENT_PATHS: readonly string[] = [
  '',
  'features',
  'pricing',
  'how-it-works',
  'demo',
  'mobile-app',
  'launch-list',
]

/** Canonical pathname for indexed English marketing URLs. */
export function seoCanonicalMarketingPath(segment: string): string {
  if (segment === '') return `/${SEO_PRIMARY_LOCALE}`
  return `/${SEO_PRIMARY_LOCALE}/${segment}`
}

/** All `/en/…` marketing URLs included in `sitemap.xml`. */
export const SEO_EN_MARKETING_CANONICAL_PATHS: readonly string[] =
  SEO_MARKETING_SEGMENT_PATHS.map(seoCanonicalMarketingPath)

/** Legal / trust pages — no `/[locale]` prefix (middleware `bypassLocaleRouting`). */
export const SEO_UNPREFIXED_CANONICAL_PATHS: readonly string[] = [
  '/about',
  '/contact',
  '/privacy',
  '/cookies',
  '/terms',
]

/** Crawlable auth entry paths (`noindex` via page metadata — not listed in `sitemap.xml`). */
export const SEO_AUTH_CRAWL_PATHS: readonly string[] = ['/auth/login', '/auth/sign-up']

/**
 * Paths explicitly allowed by `robots.txt` (whitelist model).
 *
 * Prefer matching **canonical** marketing URLs (`/en/…`) alongside legal and auth prefixes.
 *
 * Legacy bare paths like `/pricing` are **not** included: they negotiate a locale redirect,
 * whereas canonical URLs and sitemap entries use `/en/pricing`.
 */
export const SEO_PUBLIC_PATHS: readonly string[] = [
  ...SEO_EN_MARKETING_CANONICAL_PATHS,
  ...SEO_UNPREFIXED_CANONICAL_PATHS,
  ...SEO_AUTH_CRAWL_PATHS,
]

/** Canonical URLs emitted in `/sitemap.xml` (indexed pages only). */
export const SEO_SITEMAP_PATHS: readonly string[] = [
  ...SEO_EN_MARKETING_CANONICAL_PATHS,
  ...SEO_UNPREFIXED_CANONICAL_PATHS,
]

/** Prefixes crawlers should not fetch (app shell + APIs). */
export const SEO_DISALLOW_PREFIXES: readonly string[] = ['/dashboard', '/api', '/admin']
