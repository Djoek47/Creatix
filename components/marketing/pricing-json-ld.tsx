import { getAppUrl, getCanonicalUrl } from '@/lib/site-url'
import { buildPricingSoftwareOfferGraph, type PricingSoftwareOfferCopy } from '@/lib/seo/pricing-seo'

type FaqItem = { question: string; answer: string }

type Props = {
  faqs: FaqItem[]
  pageTitle: string
  pageDescription: string
  softwareOfferCopy: PricingSoftwareOfferCopy
}

export function PricingJsonLd({ faqs, pageTitle, pageDescription, softwareOfferCopy }: Props) {
  const base = getAppUrl()
  const url = getCanonicalUrl('/pricing')

  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: pageTitle,
      description: pageDescription,
      isPartOf: { '@type': 'WebSite', '@id': `${base}/#website`, url: base },
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
