import { getAppUrl, getCanonicalUrl } from '@/lib/site-url'
import { SEO_PRIMARY_LOCALE, seoCanonicalMarketingPath } from '@/lib/seo-public-paths'
import { SITE_NAME } from '@/lib/seo/marketing-metadata'

/** Organization + WebSite JSON-LD for English marketing shell (indexed locale only). */
export function MarketingSiteWideJsonLd() {
  const base = getAppUrl()
  const indexedHomeUrl = getCanonicalUrl(seoCanonicalMarketingPath(''))

  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: SITE_NAME,
        url: indexedHomeUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name: SITE_NAME,
        url: base,
        publisher: { '@id': `${base}/#organization` },
        inLanguage: SEO_PRIMARY_LOCALE,
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD for SEO
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
