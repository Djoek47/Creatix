import type { Metadata } from 'next'
import { getCanonicalUrl } from '@/lib/site-url'
import { routing } from '@/lib/i18n/routing'
import type { Phase1Locale } from '@/lib/i18n/routing'

/** Public brand name for titles and Open Graph. */
export const SITE_NAME = 'Circe et Venus'

/**
 * Default Open Graph / Twitter card image — **1200×630** landscape (Facebook / LinkedIn / Slack;
 * X `summary_large_image` works well at this size). Place the asset at `public/og.png`.
 */
export const PUBLIC_OG_IMAGE_PATH = '/og.png'
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

function ogLocaleForPhase1(locale: Phase1Locale): string {
  if (locale === 'es') return 'es_ES'
  if (locale === 'pt') return 'pt_BR'
  if (locale === 'fr') return 'fr_FR'
  return 'en_US'
}

/**
 * Indexable marketing pages under `/[locale]/…` — canonical + hreflang alternates.
 */
export function buildMarketingLocaleMetadata(opts: {
  locale: Phase1Locale
  /** Path including leading slash, e.g. `/` or `/pricing` (no locale prefix). */
  path: string
  title: string
  description: string
  keywords?: string[]
}): Metadata {
  const suffix = opts.path === '/' ? '' : opts.path
  const fullPathFor = (l: Phase1Locale) => (suffix ? `/${l}${suffix}` : `/${l}`)
  const fullPath = fullPathFor(opts.locale)
  const url = getCanonicalUrl(fullPath)
  const imageUrl = getCanonicalUrl(PUBLIC_OG_IMAGE_PATH)

  const languages: Record<string, string> = {}
  for (const l of routing.locales) {
    languages[l] = fullPathFor(l)
  }

  return {
    title: opts.title,
    description: opts.description,
    ...(opts.keywords?.length ? { keywords: opts.keywords } : {}),
    alternates: {
      canonical: fullPath,
      languages,
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: 'website',
      siteName: SITE_NAME,
      locale: ogLocaleForPhase1(opts.locale),
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

/**
 * Full Next.js metadata for indexable marketing/legal pages: canonical URL, Open Graph, Twitter, robots.
 * Use for **non-locale** routes (legal, auth shells) only.
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
