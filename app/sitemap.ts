import type { MetadataRoute } from 'next'

import { getAppUrl } from '@/lib/site-url'
import {
  seoCanonicalMarketingPath,
  SEO_SITEMAP_PATHS,
} from '@/lib/seo-public-paths'

const CHANGE_WEEKLY = new Set<string>([
  seoCanonicalMarketingPath(''),
  seoCanonicalMarketingPath('features'),
  seoCanonicalMarketingPath('pricing'),
])

const PRIORITY: Record<string, number> = {
  [seoCanonicalMarketingPath('')]: 1,
  [seoCanonicalMarketingPath('pricing')]: 0.96,
  [seoCanonicalMarketingPath('features')]: 0.94,
  [seoCanonicalMarketingPath('how-it-works')]: 0.84,
  [seoCanonicalMarketingPath('demo')]: 0.72,
  [seoCanonicalMarketingPath('mobile-app')]: 0.68,
  [seoCanonicalMarketingPath('launch-list')]: 0.64,
  '/about': 0.62,
  '/contact': 0.7,
  '/privacy': 0.52,
  '/cookies': 0.45,
  '/terms': 0.52,
}

/** Lists English-canonical marketing plus legal/trust — matches `buildMarketingLocaleMetadata` canonicals & `SEO_SITEMAP_PATHS`. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl()
  const now = new Date().toISOString()

  return SEO_SITEMAP_PATHS.map((path): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: CHANGE_WEEKLY.has(path) ? 'weekly' : 'monthly',
    priority: PRIORITY[path] ?? 0.55,
  }))
}
