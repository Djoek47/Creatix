import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/site-url'

/** Public brand name for titles and Open Graph. */
export const SITE_NAME = 'Circe et Venus'

/** Default social / OG image (square mark; replace with 1200×630 asset when available). */
const OG_IMAGE_PATH = '/icon.png'

/**
 * Full Next.js metadata for indexable marketing/legal pages: canonical URL, Open Graph, Twitter, robots.
 */
export function buildPublicMetadata(opts: {
  path: string
  title: string
  description: string
  keywords?: string[]
}): Metadata {
  const url = getCanonicalUrl(opts.path)
  const imageUrl = getCanonicalUrl(OG_IMAGE_PATH)

  return {
    title: opts.title,
    description: opts.description,
    ...(opts.keywords?.length ? { keywords: opts.keywords } : {}),
    alternates: { canonical: opts.path },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: `${SITE_NAME} — creator platform`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  }
}
