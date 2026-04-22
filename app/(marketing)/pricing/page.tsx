import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Check } from 'lucide-react'
import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { BundleMatrixCell, SoloMatrixCell } from '@/components/marketing/pricing-table-cells'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildPricingMetaDescription, buildPricingKeywords } from '@/lib/seo/pricing-seo'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'

export const metadata: Metadata = buildPublicMetadata({
  path: '/pricing',
  title: 'Pricing | Circe et Venus',
  description: buildPricingMetaDescription(),
  keywords: buildPricingKeywords(),
})

export default function PricingPage() {
  const comparisonRows = [
    { feature: '14-day free trial', trial: true, paid: true },
    {
      feature: 'AI credits',
      trial: `${TRIAL_AI_CREDITS_LIMIT}/mo`,
      paid: '20% of subscription/mo',
    },
    { feature: 'OnlyFans connection', trial: true, paid: true },
    { feature: 'Fansly / ManyVids', trial: true, paid: true },
    { feature: 'Divine Manager', trial: true, paid: true },
    { feature: 'Leak & reputation tools', trial: 'Limited', paid: true },
    { feature: 'Priority support', trial: false, paid: true },
  ]

  const faqs = [
    {
      question: 'Focus vs Unified?',
      answer:
        'Focus = 1–2 platforms. Unified = all three. Price follows your monthly revenue band.',
    },
    {
      question: 'How do AI credits work?',
      answer:
        'Paid plans include 20% of your subscription as credits each month ($1 = 100 credits). Trial: 100 credits/mo.',
    },
    {
      question: 'Free trial?',
      answer: '14 days. No card required. Upgrade or cancel anytime in Settings → Billing.',
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
        <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[480px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-circe/15 to-transparent blur-3xl" />
          </div>
          <div className="mx-auto max-w-3xl text-center">
            <MotionReveal>
              <PricingModelHeadline as="h1" />
              <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
                Pick your band. Pick your platforms. That’s it.
              </p>
            </MotionReveal>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6" aria-label="Interactive pricing estimate">
          <MotionReveal>
            <PricingPageCalculator />
          </MotionReveal>
        </section>

        <section className="px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="mx-auto max-w-6xl">
            <MotionReveal>
              <details className="group rounded-3xl border border-border/60 bg-card/30 backdrop-blur-md">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary group-open:hidden">
                      Show
                    </span>
                    <span className="hidden rounded-full bg-primary/15 px-3 py-1 text-xs text-primary group-open:inline">
                      Hide
                    </span>
                    full price table
                  </span>
                </summary>
                <div className="border-t border-border/60 pb-4">
                  <div className="overflow-x-auto px-2 sm:px-4">
                    <table className="w-full min-w-[1180px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="p-3 text-left font-serif font-semibold sm:p-4">Revenue tier</th>
                          <th className="p-3 text-right font-medium sm:p-4">OF</th>
                          <th className="p-3 text-right font-medium sm:p-4">FL</th>
                          <th className="p-3 text-right font-medium sm:p-4">MV</th>
                          <th className="p-3 text-right font-medium sm:p-4">OF + FL</th>
                          <th className="p-3 text-right font-medium sm:p-4">OF + MV</th>
                          <th className="p-3 text-right font-medium sm:p-4">FL + MV</th>
                          <th className="p-3 text-right font-medium text-fuchsia-200 sm:p-4">Unified</th>
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
                              <SoloMatrixCell usd={tier.prices.mv} />
                            </td>
                            <td className="p-3 text-right sm:p-4">
                              <BundleMatrixCell tier={tier} combo="of_fl" />
                            </td>
                            <td className="p-3 text-right sm:p-4">
                              <BundleMatrixCell tier={tier} combo="of_mv" />
                            </td>
                            <td className="p-3 text-right sm:p-4">
                              <BundleMatrixCell tier={tier} combo="fl_mv" />
                            </td>
                            <td className="p-3 text-right sm:p-4">
                              <BundleMatrixCell tier={tier} combo="unified" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            </MotionReveal>
          </div>
        </section>

        <section className="border-y border-border/40 bg-card/20 px-4 py-12 backdrop-blur-sm sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <MotionReveal className="text-center">
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Trial vs paid</h2>
            </MotionReveal>
            <MotionReveal delay={0.08}>
              <div className="mt-8 overflow-hidden rounded-2xl border border-border/60">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-4 text-left"></th>
                      <th className="p-4 text-center">Trial</th>
                      <th className="p-4 text-center">Paid</th>
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

        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <MotionReveal className="mb-8 text-center">
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Questions</h2>
            </MotionReveal>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
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

        <section className="px-4 pb-20 sm:px-6 sm:pb-24">
          <MotionReveal className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-circe/[0.08] via-card to-primary/[0.08] p-10 text-center sm:p-12">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Start free.</h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-primary-foreground shadow-lg"
                >
                  Start free trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-primary/35 px-10">
                  Features
                </Button>
              </Link>
            </div>
          </MotionReveal>
        </section>
      </main>
    </>
  )
}
