'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { BundleMatrixCell, SoloMatrixCell } from '@/components/marketing/pricing-table-cells'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { useMarketingMode } from '@/components/marketing/marketing-mode-context'
import { ProModeToggle } from '@/components/marketing/pro-mode-toggle'
import { protectionProduct } from '@/lib/seo/pricing-seo'
import { fmtUsd } from '@/lib/marketing/fmt-usd'

const COMPARISON_ROW_KEYS = [0, 1, 2, 3, 4, 5, 6] as const

function PricingFaqs() {
  const { mode } = useMarketingMode()
  const t = useTranslations('marketing')
  const protectionPrice = fmtUsd(protectionProduct.priceMonthly ?? 25)

  const items = [
    {
      question: t('pricing.faq.bundleQuestion'),
      answer: t('pricing.faq.bundleAnswer', { protectionPrice }),
    },
    {
      question: t('pricing.faq.creditsQuestion'),
      answer: t('pricing.faq.creditsAnswer', { trialCredits: TRIAL_AI_CREDITS_LIMIT }),
    },
    {
      question: t('pricing.faq.trialQuestion'),
      answer: t('pricing.faq.trialAnswerPage'),
    },
    ...(mode === 'pro'
      ? [
          {
            question: t('pricing.faq.changeQuestion'),
            answer: t('pricing.faq.changeAnswerPagePro'),
          },
        ]
      : []),
  ]

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <MotionReveal className="mb-8 text-center">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{t('pricing.faq.heading')}</h2>
        </MotionReveal>
        <div className="space-y-3">
          {items.map((faq, i) => (
            <MotionReveal key={faq.question} delay={i * 0.04}>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingProSections() {
  const t = useTranslations('marketing')
  const protectionPrice = fmtUsd(protectionProduct.priceMonthly ?? 25)

  const comparisonRows = COMPARISON_ROW_KEYS.map((key, index) => {
    const feature = t(`pricing.page.comparisonRows.${key}.feature`)
    if (index === 0) {
      return { feature, trial: true, paid: true as const }
    }
    if (index === 1) {
      return {
        feature,
        trial: t('pricing.page.comparisonAiTrial', { count: TRIAL_AI_CREDITS_LIMIT }),
        paid: t('pricing.page.comparisonAiPaid'),
      }
    }
    if (index === 5) {
      return { feature, trial: t('pricing.page.comparisonLimited'), paid: true as const }
    }
    if (index === 6) {
      return { feature, trial: false, paid: true as const }
    }
    return { feature, trial: true, paid: true as const }
  })

  return (
    <>
      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl">
          <MotionReveal>
            <details className="group rounded-3xl border border-border/60 bg-card/30 backdrop-blur-md" open>
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">{t('pricing.page.fullPriceTableToggle')}</span>
              </summary>
              <div className="border-t border-border/60 pb-4">
                <div className="overflow-x-auto px-2 sm:px-4">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="p-3 text-left font-serif font-semibold sm:p-4">
                          {t('pricing.page.matrixColRevenueTier')}
                        </th>
                        <th className="p-3 text-right font-medium sm:p-4">{t('pricing.page.matrixColOnlyFans')}</th>
                        <th className="p-3 text-right font-medium sm:p-4">{t('pricing.page.matrixColFansly')}</th>
                        <th className="p-3 text-right font-medium text-fuchsia-900 dark:text-fuchsia-200 sm:p-4">
                          {t('pricing.page.matrixColBundled')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRICING_TIERS.map((tier) => (
                        <tr
                          key={tier.tierIndex}
                          className="border-b border-border/40 transition-colors hover:bg-muted/20"
                        >
                          <td className="p-3 text-muted-foreground sm:p-4">{tier.label}</td>
                          <td className="p-3 text-right sm:p-4">
                            <SoloMatrixCell usd={tier.prices.of} />
                          </td>
                          <td className="p-3 text-right sm:p-4">
                            <SoloMatrixCell usd={tier.prices.fl} />
                          </td>
                          <td className="p-3 text-right sm:p-4">
                            <BundleMatrixCell tier={tier} combo="of_fl" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-2 pt-3 text-center text-xs text-muted-foreground sm:px-4">
                  {t.rich('pricing.page.fullPriceTableFootnote', {
                    protectionPrice,
                    lead: (chunks) => <strong className="text-foreground/90">{chunks}</strong>,
                  })}
                </p>
              </div>
            </details>
          </MotionReveal>
        </div>
      </section>

      <section className="border-y border-border/40 bg-card/20 px-4 py-12 backdrop-blur-sm sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{t('pricing.page.trialVsPaidHeading')}</h2>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border/60">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-4 text-left"></th>
                    <th className="p-4 text-center">{t('pricing.page.trialVsPaidColTrial')}</th>
                    <th className="p-4 text-center">{t('pricing.page.trialVsPaidColPaid')}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((r) => (
                    <tr key={r.feature} className="border-b border-border/40">
                      <td className="p-4">{r.feature}</td>
                      <td className="p-4 text-center">
                        {typeof r.trial === 'boolean' ? (
                          r.trial ? (
                            <Check className="mx-auto h-5 w-5 text-emerald-400" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">{r.trial}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof r.paid === 'boolean' ? (
                          r.paid ? (
                            <Check className="mx-auto h-5 w-5 text-primary" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span>{r.paid}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionReveal>
        </div>
      </section>
    </>
  )
}

function PricingPageBody() {
  const { mode } = useMarketingMode()
  const t = useTranslations('marketing')

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-6 pt-12 sm:px-6 sm:pb-8 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[480px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-circe/15 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <MotionReveal>
            <PricingModelHeadline as="h1" />
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:text-lg">{t('pricing.page.pickBand')}</p>
            <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
              {t('pricing.page.toggleBefore')}
              <span className="font-medium text-foreground">{t('pricing.page.toggleMatrixWord')}</span>
              {t('pricing.page.toggleAfter')}
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl justify-end">
          <ProModeToggle className="mb-4" proLabel={t('pricing.page.proModeMatrix')} proAccent="rainbow" />
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6" aria-label={t('pricingCalculator.landingAria')}>
        <MotionReveal>
          <PricingPageCalculator />
        </MotionReveal>
      </section>

      {mode === 'pro' ? <PricingProSections /> : null}
      <PricingFaqs />
    </>
  )
}

export function MarketingPricingPageContent() {
  return <PricingPageBody />
}
