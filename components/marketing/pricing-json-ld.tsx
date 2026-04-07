import { getAppUrl, getCanonicalUrl } from '@/lib/site-url'
import { buildPricingMetaDescription, buildPricingProductOfferGraph } from '@/lib/seo/pricing-seo'

type FaqItem = { question: string; answer: string }

export function PricingJsonLd({ faqs }: { faqs: FaqItem[] }) {
  const base = getAppUrl()
  const url = getCanonicalUrl('/pricing')
  const description = buildPricingMetaDescription()

  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: 'Pricing | Circe et Venus',
      description,
      isPartOf: { '@type': 'WebSite', '@id': `${base}/#website`, url: base },
    },
    ...buildPricingProductOfferGraph(url),
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
