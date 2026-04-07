import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/site-url'

/** Public brand name for titles and Open Graph. */
export const SITE_NAME = 'Circe et Venus'

/**
 * Default Open Graph / Twitter card image — **1200×630** landscape (Facebook / LinkedIn / Slack;
 * X `summary_large_image` works well at this size). Place the asset at `public/og.png`.
 */
export const PUBLIC_OG_IMAGE_PATH = '/og.png'
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

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
  const imageUrl = getCanonicalUrl(PUBLIC_OG_IMAGE_PATH)

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
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
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
