'use client'

import { Check } from 'lucide-react'
import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { BundleMatrixCell, SoloMatrixCell } from '@/components/marketing/pricing-table-cells'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { useMarketingMode } from '@/components/marketing/marketing-mode-context'
import { ProModeToggle } from '@/components/marketing/pro-mode-toggle'

function PricingFaqs() {
  const { mode } = useMarketingMode()
  const items = [
    {
      question: 'Focus vs Bundled?',
      answer:
        'Focus = one platform or a two-platform pair with band-specific list prices. Bundled = OnlyFans + Fansly together. Non-API coverage (ManyVids, Clips4Sale, etc.) uses the separate $25/mo Protection plan.',
    },
    {
      question: 'How do AI credits work?',
      answer:
        `Paid plans include 20% of your subscription as credits each month ($1 = 100 credits). Trial: ${TRIAL_AI_CREDITS_LIMIT} credits total.`,
    },
    {
      question: 'Free trial?',
      answer: 'See current trial terms when you sign up. Upgrade or cancel anytime in Settings → Billing.',
    },
    ...(mode === 'pro'
      ? [
          {
            question: 'Change plans later?',
            answer: 'Yes. Swap platforms, Focus, Bundled, Protection, or band in Settings → Billing.',
          },
        ]
      : []),
  ]

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <MotionReveal className="mb-8 text-center">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Questions</h2>
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
  const comparisonRows = [
    { feature: '2-day free trial (card required)', trial: true, paid: true },
    {
      feature: 'AI credits',
      trial: `${TRIAL_AI_CREDITS_LIMIT}/mo`,
      paid: '20% of subscription/mo',
    },
    { feature: 'OnlyFans connection', trial: true, paid: true },
    { feature: 'Fansly', trial: true, paid: true },
    { feature: 'Divine Manager', trial: true, paid: true },
    { feature: 'Leak & reputation tools', trial: 'Limited', paid: true },
    { feature: 'Priority support', trial: false, paid: true },
  ]

  return (
    <>
      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl">
          <MotionReveal>
            <details className="group rounded-3xl border border-border/60 bg-card/30 backdrop-blur-md" open>
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">Full price table</span>
              </summary>
              <div className="border-t border-border/60 pb-4">
                <div className="overflow-x-auto px-2 sm:px-4">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="p-3 text-left font-serif font-semibold sm:p-4">Revenue tier</th>
                        <th className="p-3 text-right font-medium sm:p-4">OnlyFans</th>
                        <th className="p-3 text-right font-medium sm:p-4">Fansly</th>
                        <th className="p-3 text-right font-medium text-fuchsia-200 sm:p-4">Bundled (OnlyFans + Fansly)</th>
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
                  <strong className="text-foreground/90">Protection &amp; Anti-Piracy</strong> (Clips4Sale, ManyVids, Loyalfans, Fanvue, MYM, and other
                  non-API coverage) is a separate <strong className="text-foreground/90">$25/mo</strong> add-on — use it alone or stack it with a
                  main plan. Checkout in the app.
                </p>
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
    </>
  )
}

function PricingPageBody() {
  const { mode } = useMarketingMode()

  return (
    <>
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
            <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
              Toggle <span className="font-medium text-foreground">Pro</span> for the full matrix and trial comparison.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl justify-end">
          <ProModeToggle className="mb-4" />
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6" aria-label="Interactive pricing estimate">
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
