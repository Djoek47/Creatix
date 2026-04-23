import type { Metadata } from 'next'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildPricingMetaDescription, buildPricingKeywords } from '@/lib/seo/pricing-seo'
import { MarketingModeProvider } from '@/components/marketing/marketing-mode-context'
import { MarketingPricingPageContent } from '@/components/marketing/marketing-pricing-page-content'

export const metadata: Metadata = buildPublicMetadata({
  path: '/pricing',
  title: 'Pricing | Circe et Venus',
  description: buildPricingMetaDescription(),
  keywords: buildPricingKeywords(),
})

export default function PricingPage() {
  const faqs = [
    {
      question: 'Focus vs Unified?',
      answer: 'Focus = 1–2 platforms. Unified = all three. Price follows your monthly revenue band.',
    },
    {
      question: 'How do AI credits work?',
      answer:
        'Paid plans include 20% of your subscription as credits each month ($1 = 100 credits). Trial: 250 credits total.',
    },
    {
      question: 'Free trial?',
      answer: '2 days. Credit card required. Upgrade or cancel anytime in Settings → Billing.',
    },
    {
      question: 'Change plans later?',
      answer: 'Yes. Swap platforms, Focus, Unified, or band in Settings → Billing.',
    },
  ]

  return (
    <>
      <PricingJsonLd faqs={faqs} />
      <main className="relative z-10 pt-14 sm:pt-16">
        <MarketingModeProvider>
          <MarketingPricingPageContent />
        </MarketingModeProvider>
      </main>
    </>
  )
}
