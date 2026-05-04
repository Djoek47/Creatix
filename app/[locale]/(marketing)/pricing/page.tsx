import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { PricingEnterpriseTrust } from '@/components/marketing/pricing-enterprise-trust'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { MarketingModeProvider } from '@/components/marketing/marketing-mode-context'
import { MarketingPricingPageContent } from '@/components/marketing/marketing-pricing-page-content'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { PROTECTION_PLAN_ID } from '@/lib/billing/access'
import { getTranslations } from 'next-intl/server'
import { getPricingSeoInterpolation } from '@/lib/seo/pricing-seo'
import { fmtUsd } from '@/lib/marketing/fmt-usd'

type PageProps = { params: Promise<{ locale: string }> }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const seo = getPricingSeoInterpolation()
  const protectionPrice = fmtUsd(seo.prot)
  const description = t('pricing.meta.description', {
    ofRange: `${fmtUsd(seo.ofMin)}–${fmtUsd(seo.ofMax)}`,
    bundledRange: `${fmtUsd(seo.bMin)}–${fmtUsd(seo.bMax)}`,
    protectionPrice,
  })
  const keywords = [
    ...asStringArray(t.raw('pricing.keywords')),
    t('pricing.keywordsOnlyFansEntry', { entryPrice: fmtUsd(seo.minOf) }),
    PROTECTION_PLAN_ID,
  ]

  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/pricing',
    title: t('pricing.meta.title'),
    description,
    keywords,
  })
}

export default async function PricingPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const seo = getPricingSeoInterpolation()
  const protectionPrice = fmtUsd(seo.prot)

  const pageTitle = t('pricing.meta.title')
  const pageDescription = t('pricing.meta.description', {
    ofRange: `${fmtUsd(seo.ofMin)}–${fmtUsd(seo.ofMax)}`,
    bundledRange: `${fmtUsd(seo.bMin)}–${fmtUsd(seo.bMax)}`,
    protectionPrice,
  })

  const softwareOfferCopy = {
    applicationDescription: pageDescription,
    aggregateOfferDescription: t('pricing.jsonLd.aggregateOfferDescription', {
      minMonthly: seo.minMonthly,
      maxMonthly: seo.maxMonthly,
      prot: seo.prot,
    }),
  }

  const trialLine = t('pricing.model.trialLine')
  const trialBilling = t('pricing.faq.trialBillingHint')

  const pricingJsonLdFaqs = [
    {
      question: t('pricing.faq.bundleQuestionJsonLd'),
      answer: t('pricing.faq.bundleAnswerJsonLd', { protectionPrice }),
    },
    {
      question: t('pricing.faq.creditsQuestion'),
      answer: t('pricing.faq.creditsAnswer', { trialCredits: TRIAL_AI_CREDITS_LIMIT }),
    },
    {
      question: t('pricing.faq.trialQuestion'),
      answer: `${trialLine} ${trialBilling}`,
    },
    {
      question: t('pricing.faq.changeQuestion'),
      answer: t('pricing.faq.changeAnswerJsonLd'),
    },
  ]

  const pathnameForLd = `/${locale}/pricing`

  return (
    <>
      <PricingJsonLd
        faqs={pricingJsonLdFaqs}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        softwareOfferCopy={softwareOfferCopy}
        canonicalPathname={pathnameForLd}
      />
      <main className="marketing-main-offset relative z-10">
        <MarketingModeProvider>
          <MarketingPricingPageContent />
        </MarketingModeProvider>
        <PricingEnterpriseTrust locale={locale} />
      </main>
    </>
  )
}
