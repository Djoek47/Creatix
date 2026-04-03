/**
 * URLs that are meant to be discoverable by search engines (sitemap + robots `Allow`).
 *
 * The signed-in product lives under `/dashboard` and related API routes under `/api`.
 * Those areas are **not** listed here: they are blocked in `robots.txt`, omitted from
 * `sitemap.xml`, and tagged `noindex` on the dashboard layout so Google and others
 * should not treat app screens as public landing pages—even if a URL leaks.
 */
export const SEO_PUBLIC_PATHS: readonly string[] = [
  '/',
  '/features',
  '/pricing',
  '/how-it-works',
  '/auth/login',
  '/auth/sign-up',
  '/auth/sign-up-success',
  '/about',
  '/contact',
  '/privacy',
  '/cookies',
  '/terms',
]

/** Prefixes crawlers should not fetch (app shell + APIs). */
export const SEO_DISALLOW_PREFIXES: readonly string[] = ['/dashboard', '/api']
