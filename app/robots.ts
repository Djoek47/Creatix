import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/site-url'
import { SEO_DISALLOW_PREFIXES, SEO_PUBLIC_PATHS } from '@/lib/seo-public-paths'

/**
 * Only marketing/legal/auth entry paths are allowed. `/dashboard` and `/api` are
 * disallowed so authenticated UI and endpoints are not treated as public site content.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: [...SEO_PUBLIC_PATHS],
        disallow: [...SEO_DISALLOW_PREFIXES],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

