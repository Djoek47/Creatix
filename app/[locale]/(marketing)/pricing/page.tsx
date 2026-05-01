import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { buildPricingMetaDescription, buildPricingKeywords } from '@/lib/seo/pricing-seo'
import { MarketingModeProvider } from '@/components/marketing/marketing-mode-context'
import { MarketingPricingPageContent } from '@/components/marketing/marketing-pricing-page-content'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/pricing',
    title: 'Pricing | Circe et Venus',
    description: buildPricingMetaDescription(),
    keywords: buildPricingKeywords(),
  })
}

const pricingJsonLdFaqs = [
  {
    question: 'Single platform vs Bundled vs Protection?',
    answer:
      'Single platform = one adult platform or a two-platform pair. Bundled = OnlyFans + Fansly together. Protection = $25/mo for anti-piracy on Clips4Sale, ManyVids, Loyalfans, Fanvue, MYM, and similar; stackable with a main plan or standalone.',
  },
  {
    question: 'How do AI credits work?',
    answer:
      `Paid plans include 20% of your subscription as credits each month ($1 = 100 credits). Trial: ${TRIAL_AI_CREDITS_LIMIT} credits total.`,
  },
  {
    question: 'Free trial?',
    answer: PRICING_MODEL_TRIAL_LINE + ' Upgrade or cancel anytime in Settings → Billing.',
  },
  {
    question: 'Change plans later?',
    answer: 'Yes. Swap platforms, single-platform vs Bundled, or band in Settings → Billing.',
  },
]

export default function PricingPage() {
  return (
    <>
      <PricingJsonLd faqs={pricingJsonLdFaqs} />
      <main className="relative z-10 pt-14 sm:pt-16">
        <MarketingModeProvider>
          <MarketingPricingPageContent />
        </MarketingModeProvider>
      </main>
    </>
  )
}
