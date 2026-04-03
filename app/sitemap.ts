import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/site-url'
import { SEO_PUBLIC_PATHS } from '@/lib/seo-public-paths'

/** Sitemap lists public pages only; `/dashboard` and app APIs are excluded on purpose. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl()
  const now = new Date().toISOString()

  return SEO_PUBLIC_PATHS.map((path): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}

