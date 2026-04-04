import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/site-url'
import { SEO_PUBLIC_PATHS } from '@/lib/seo-public-paths'

const PRIORITY: Record<string, number> = {
  '/': 1,
  '/features': 0.95,
  '/pricing': 0.95,
  '/how-it-works': 0.85,
  '/auth/sign-up': 0.75,
  '/auth/login': 0.65,
}

/** Sitemap lists public pages only; `/dashboard` and app APIs are excluded on purpose. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl()
  const now = new Date().toISOString()

  return SEO_PUBLIC_PATHS.map((path): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: path === '/' || path === '/pricing' || path === '/features' ? 'weekly' : 'monthly',
    priority: PRIORITY[path] ?? 0.6,
  }))
}

