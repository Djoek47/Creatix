import { getAppUrl, getCanonicalUrl } from '@/lib/site-url'
import { SEO_PRIMARY_LOCALE } from '@/lib/seo-public-paths'
import { buildPricingSoftwareOfferGraph, type PricingSoftwareOfferCopy } from '@/lib/seo/pricing-seo'

type FaqItem = { question: string; answer: string }

type Props = {
  faqs: FaqItem[]
  pageTitle: string
  pageDescription: string
  softwareOfferCopy: PricingSoftwareOfferCopy
  /** Locale-prefixed path, e.g. `/en/pricing` — must match page canonical. */
  canonicalPathname: string
}

export function PricingJsonLd({
  faqs,
  pageTitle,
  pageDescription,
  softwareOfferCopy,
  canonicalPathname,
}: Props) {
  const base = getAppUrl()
  const url = getCanonicalUrl(canonicalPathname)
  const localeSeg = canonicalPathname.split('/').filter(Boolean)[0] ?? SEO_PRIMARY_LOCALE
  const homeUrl = getCanonicalUrl(`/${localeSeg}`)

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: pageTitle,
      description: pageDescription,
      isPartOf: { '@type': 'WebSite', '@id': `${base}/#website`, url: base },
      breadcrumb: { '@id': `${url}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: homeUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Pricing',
          item: url,
        },
      ],
    },
    ...buildPricingSoftwareOfferGraph(url, softwareOfferCopy),
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ]

  const json = { '@context': 'https://schema.org', '@graph': graph }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD for SEO
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
