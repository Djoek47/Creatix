import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Moon, Sun, Check, Sparkles, Layers, Cpu } from 'lucide-react'
import { BUNDLE_ADDONS, PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { BundleMatrixCell, SoloMatrixCell } from '@/components/marketing/pricing-table-cells'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildPricingMetaDescription, buildPricingKeywords } from '@/lib/seo/pricing-seo'
import { CREDIT_ALLOWANCE_MARKETING_LINE } from '@/lib/marketing/pricing-copy'
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
      feature: 'AI credits (included pool)',
      trial: `${TRIAL_AI_CREDITS_LIMIT}/mo cap`,
      paid: '20% of subscription as credits/mo (see calculator)',
    },
    { feature: 'OnlyFans connection', trial: true, paid: true },
    { feature: 'Fansly / ManyVids', trial: true, paid: 'When included in your plan' },
    { feature: 'Divine Manager (voice + chat)', trial: true, paid: true },
    { feature: 'Leak & reputation tools', trial: 'Limited', paid: true },
    { feature: 'Priority support', trial: false, paid: true },
  ]

  const faqs = [
    {
      question: 'What is Focus vs Unified?',
      answer: `Focus is one or two adult platforms at a price for your revenue band. Unified is all three (OnlyFans, Fansly, ManyVids) at OnlyFans base + $${BUNDLE_ADDONS.UNIFIED_ON_OF}/mo for that band. Use the calculator above to see your estimate.`,
    },
    {
      question: 'How do AI credits work?',
      answer: CREDIT_ALLOWANCE_MARKETING_LINE + ` Trial accounts use a fixed ${TRIAL_AI_CREDITS_LIMIT} credits per month.`,
    },
    {
      question: 'How does the 14-day free trial work?',
      answer:
        'Start with trial limits. Upgrade anytime from Settings → Billing. Cancel before the trial ends if you do not want to continue.',
    },
    {
      question: 'Can I change plans or bands later?',
      answer:
        'Yes. Change Focus platforms, Unified, or revenue band in Settings → Billing. Stripe customer portal handles payment methods and cancellation.',
    },
    {
      question: 'Does my band update when my revenue grows?',
      answer:
        'We infer your band from connected OnlyFans and Fansly earnings; a scheduled job aligns your Stripe subscription when your tier changes. Updates apply on your next invoice (no mid-cycle proration). You can also change band manually in billing.',
    },
  ]

  return (
    <>
      <PricingJsonLd faqs={faqs} />
      <main className="relative z-10 pt-14 sm:pt-16">
        <section className="relative overflow-hidden px-4 pb-10 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[480px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-circe/15 to-transparent blur-3xl" />
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <MotionReveal>
              <Badge className="mb-4 gap-1.5 border-primary/40 bg-primary/10 px-4 py-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                14-day free trial
              </Badge>
              <PricingModelHeadline as="h1" />
              <div className="mx-auto mt-5 max-w-2xl space-y-4 text-left text-base text-muted-foreground sm:text-lg">
                <PricingModelInlineBlurb />
                <ul className="list-inside list-disc space-y-2 text-pretty">
                  <li>
                    <strong className="text-foreground">Focus:</strong> pay for the platforms you use (one or two).
                  </li>
                  <li>
                    <strong className="text-foreground">Unified:</strong> one bill for OnlyFans + Fansly + ManyVids.
                  </li>
                  <li>
                    <strong className="text-foreground">Credits:</strong> {CREDIT_ALLOWANCE_MARKETING_LINE}
                  </li>
                </ul>
                <p className="text-center text-sm">
                  <Link href="/dashboard/settings?tab=billing" className="text-primary underline-offset-4 hover:underline">
                    Manage billing in the app
                  </Link>
                </p>
              </div>
            </MotionReveal>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-3">
            <MotionStagger stagger={0.08} className="contents sm:contents">
              <MotionStaggerItem>
                <div className="rounded-2xl border border-circe/30 bg-gradient-to-br from-circe/[0.08] to-card/90 p-5 shadow-lg backdrop-blur-md">
                  <Layers className="h-8 w-8 text-circe-light" aria-hidden />
                  <h2 className="mt-3 font-serif text-lg font-semibold">Focus</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    One or two platforms. Pricing follows your monthly revenue band.
                  </p>
                </div>
              </MotionStaggerItem>
              <MotionStaggerItem>
                <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-card/90 p-5 shadow-lg backdrop-blur-md">
                  <Sparkles className="h-8 w-8 text-primary" aria-hidden />
                  <h2 className="mt-3 font-serif text-lg font-semibold">Unified</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {`All three platforms — OnlyFans base + $${BUNDLE_ADDONS.UNIFIED_ON_OF}/mo for your band.`}
                  </p>
                </div>
              </MotionStaggerItem>
              <MotionStaggerItem>
                <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.06] to-card/90 p-5 shadow-lg backdrop-blur-md">
                  <Cpu className="h-8 w-8 text-fuchsia-300" aria-hidden />
                  <h2 className="mt-3 font-serif text-lg font-semibold">AI credits</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Paid plans include a monthly pool from your subscription. Each tool run debits credits; heavy jobs
                    cost more. See the calculator for your tier.
                  </p>
                </div>
              </MotionStaggerItem>
            </MotionStagger>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6" aria-label="Interactive pricing estimate">
          <MotionReveal>
            <PricingPageCalculator />
          </MotionReveal>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <MotionReveal className="mb-6 text-center">
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Full price table</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                All amounts USD/month, before tax. Most visitors only need the calculator above.
              </p>
            </MotionReveal>
            <MotionReveal>
              <details className="group rounded-3xl border border-border/60 bg-card/30 backdrop-blur-md">
                <summary className="cursor-pointer list-none px-4 py-4 font-medium text-foreground sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary group-open:hidden">
                      Show
                    </span>
                    <span className="hidden rounded-full bg-primary/15 px-3 py-1 text-xs text-primary group-open:inline">
                      Hide
                    </span>
                    monthly matrix (all revenue bands)
                  </span>
                </summary>
                <div className="border-t border-border/60 px-0 pb-4">
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
                          <th className="p-3 text-right font-medium text-fuchsia-200 sm:p-4">Unified (all 3)</th>
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
                  <p className="px-4 pt-3 text-center text-xs text-muted-foreground sm:px-6">
                    Green bundle cells show savings vs buying each included line separately. Unified is all three in one
                    workspace.
                  </p>
                </div>
              </details>
            </MotionReveal>

            <MotionReveal className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-primary-foreground shadow-xl"
                >
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/settings?tab=billing">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-primary/35 px-8">
                  Billing in app
                </Button>
              </Link>
            </MotionReveal>
          </div>
        </section>

        <section className="border-y border-border/40 bg-card/20 px-4 py-14 backdrop-blur-sm sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <MotionReveal className="text-center">
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Trial vs paid</h2>
            </MotionReveal>
            <MotionReveal delay={0.08}>
              <div className="mt-8 overflow-hidden rounded-2xl border border-border/60">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-4 text-left">Feature</th>
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

        <section className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <MotionReveal className="mb-8 text-center">
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Questions</h2>
            </MotionReveal>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <MotionReveal key={faq.question} delay={i * 0.04}>
                  <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
                    <h3 className="font-semibold">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-6xl space-y-12">
            <MotionReveal>
              <DivineCommandCenter />
            </MotionReveal>
            <MotionReveal className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-circe/[0.08] via-card to-primary/[0.08] p-10 text-center sm:p-14">
              <div className="mb-6 flex justify-center gap-4">
                <div className="rounded-full bg-circe/25 p-4">
                  <Moon className="h-8 w-8 text-circe-light" />
                </div>
                <div className="rounded-full bg-primary/20 p-4">
                  <Sun className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Ready when you are</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Connect your platforms, open Divine Manager, and run your business from one workspace — with clear
                pricing and included AI credits.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/sign-up">
                  <Button
                    size="lg"
                    className="h-12 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-primary-foreground shadow-lg"
                  >
                    Start free trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="h-12 rounded-full border-primary/35 px-10">
                    Explore features
                  </Button>
                </Link>
              </div>
            </MotionReveal>
          </div>
        </section>
      </main>
    </>
  )
}
