import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Moon,
  Sun,
  Check,
  Sparkles,
  Percent,
} from 'lucide-react'
import {
  REVENUE_TIERS,
  MANYVIDS_FOCUS_SINGLE_FLAT_USD,
  percentVsOnlyFansBase,
  percentSavingsTwoPlatformFocus,
  FOCUS_PLATFORM_SAVINGS_PCT,
} from '@/lib/pricing-matrix'
import { BUNDLE_ADDONS, PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { BundleMatrixCell, SoloMatrixCell } from '@/components/marketing/pricing-table-cells'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { cn } from '@/lib/utils'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildPricingMetaDescription, buildPricingKeywords } from '@/lib/seo/pricing-seo'

function SavingsGlanceCard({
  label,
  pct,
  fixedDiscount,
}: {
  label: string
  pct: number
  /** When true, always show as a discount (single-platform vs OF). */
  fixedDiscount?: boolean
}) {
  const rounded = Math.round(pct)
  const asSavings = fixedDiscount === true || rounded > 0
  const n = Math.abs(rounded)
  return (
    <div className="rounded-2xl border border-border/50 bg-background/50 px-4 py-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-2 font-serif text-3xl font-semibold',
          asSavings ? 'text-emerald-400/95' : 'text-amber-300/90',
        )}
      >
        {asSavings ? `−${n}%` : `+${n}%`}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">vs OnlyFans base</p>
    </div>
  )
}

export const metadata: Metadata = buildPublicMetadata({
  path: '/pricing',
  title: 'Pricing | Circe et Venus',
  description: buildPricingMetaDescription(),
  keywords: buildPricingKeywords(),
})

export default function PricingPage() {
  const sampleTier = REVENUE_TIERS[4]
  const ofFlSavings = percentSavingsTwoPlatformFocus(sampleTier, 'onlyfans', 'fansly')
  const ofMvSavings = percentSavingsTwoPlatformFocus(sampleTier, 'onlyfans', 'manyvids')
  const flMvSavings = percentSavingsTwoPlatformFocus(sampleTier, 'fansly', 'manyvids')
  const mvSoloVsOfPct = percentVsOnlyFansBase(sampleTier, MANYVIDS_FOCUS_SINGLE_FLAT_USD)

  const comparisonRows = [
    { feature: '14-day free trial', trial: true, paid: true },
    { feature: 'AI credits & storage', trial: 'Limited', paid: 'Unlimited (paid tiers)' },
    { feature: 'OnlyFans connection', trial: true, paid: true },
    { feature: 'Fansly / ManyVids', trial: true, paid: 'Focus (if included) or Unified' },
    { feature: 'Divine Manager (voice + chat)', trial: true, paid: true },
    { feature: 'Leak & reputation tools', trial: 'Limited', paid: true },
    { feature: 'Priority support', trial: false, paid: true },
  ]

  const faqs = [
    {
      question: 'What do the bundle savings lines mean?',
      answer:
        'For OF + FL, OF + MV, FL + MV, and Unified, the small line under the price is dollars and percent saved versus buying each included platform at its solo Focus price for that row. Solo OF / FL / MV columns are plain monthly USD for each line.',
    },
    {
      question: 'What is Focus vs Unified?',
      answer:
        `Focus covers one or two adult platforms. OnlyFans is the price base; Fansly is about ${Math.round((1 - BUNDLE_ADDONS.FL_DISCOUNT) * 100)}% lower (capped at $${BUNDLE_ADDONS.FL_CAP}/mo); ManyVids solo Focus is a flat $${BUNDLE_ADDONS.MV_FLAT}/mo at every band. Two-platform Focus uses fixed bundle prices: OnlyFans + Fansly = OF base + $${BUNDLE_ADDONS.FL_ON_OF}; OnlyFans + ManyVids = OF base + $${BUNDLE_ADDONS.MV_ON_OF}; Fansly + ManyVids = Fansly line + $${BUNDLE_ADDONS.MV_ON_FL}. Unified (all three) = OnlyFans base + $${BUNDLE_ADDONS.UNIFIED_ON_OF} for your revenue band.`,
    },
    {
      question: 'Which single platform is the best discount?',
      answer:
        `Fansly is about ${Math.round((1 - BUNDLE_ADDONS.FL_DISCOUNT) * 100)}% below the OnlyFans base at each band (with a $${BUNDLE_ADDONS.FL_CAP}/mo cap on the Fansly line). ManyVids solo Focus is always $${BUNDLE_ADDONS.MV_FLAT}/mo — compare the OF and MV columns for your band; at low bands MV can be slightly above OF base, at high bands it is far below.`,
    },
    {
      question: 'What about two-platform pairs?',
      answer:
        `Example at the “${sampleTier.label}” band vs OnlyFans-only: OnlyFans + Fansly is about ${ofFlSavings >= 0 ? `${ofFlSavings}% lower` : `${-ofFlSavings}% higher`}; OnlyFans + ManyVids about ${ofMvSavings >= 0 ? `${ofMvSavings}% lower` : `${-ofMvSavings}% higher`}; Fansly + ManyVids about ${flMvSavings >= 0 ? `${flMvSavings}% lower` : `${-flMvSavings}% higher`}. The full matrix lists each pair’s fixed price plus savings versus buying those platforms solo; rounding can vary by $1 at some bands.`,
    },
    {
      question: 'How does the 14-day free trial work?',
      answer:
        'Start with limited trial limits. Upgrade anytime from Settings → Billing. Cancel before the trial ends if you do not want to continue.',
    },
    {
      question: 'Can I change plans later?',
      answer:
        'Yes. Use the in-app billing section for a new band, Focus platform set, or Unified. Stripe customer portal handles payment methods and cancellation.',
    },
    {
      question: 'Will my subscription band update automatically when my revenue grows?',
      answer:
        'Creatix reads month-to-date-style earnings from connected OnlyFans and Fansly to infer your band. A scheduled job aligns your Stripe subscription amount and band metadata when observed revenue implies a different tier — changes apply on your next invoice (no mid-cycle proration). You can still change band or plan anytime in Settings → Billing.',
    },
  ]

  return (
    <>
      <PricingJsonLd faqs={faqs} />
      <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[480px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/20 via-circe/15 to-transparent blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <MotionReveal>
            <Badge className="mb-4 gap-1.5 border-primary/40 bg-primary/10 px-4 py-1.5 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              14-day free trial · Transparent math
            </Badge>
            <PricingModelHeadline as="h1" />
            <div className="mx-auto mt-5 max-w-2xl space-y-3 text-base text-muted-foreground sm:text-lg">
              <PricingModelInlineBlurb />
              <p>
                Solo columns list each platform line; bundle columns show the fixed price plus savings versus buying
                those lines separately. Unified is highlighted as the best total value for all three.
              </p>
            </div>
          </MotionReveal>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-3">
          <MotionStagger stagger={0.1} className="contents lg:contents">
            <MotionStaggerItem>
              <div className="rounded-3xl border border-circe/30 bg-gradient-to-br from-circe/[0.1] to-card/90 p-6 shadow-xl backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-widest text-circe-light">Focus</p>
                <p className="mt-2 font-serif text-xl font-semibold">1–2 platforms</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fansly ≈ −{FOCUS_PLATFORM_SAVINGS_PCT.fansly}% vs OnlyFans base (capped at ${BUNDLE_ADDONS.FL_CAP}/mo).
                  ManyVids solo Focus is ${BUNDLE_ADDONS.MV_FLAT}/mo flat. Two picks use bundle add-ons: OF+FL +$
                  {BUNDLE_ADDONS.FL_ON_OF}, OF+MV +${BUNDLE_ADDONS.MV_ON_OF}, FL+MV +${BUNDLE_ADDONS.MV_ON_FL} on top of
                  the primary line. The matrix shows savings vs solo for each bundle.
                </p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/[0.12] to-card/90 p-6 shadow-xl backdrop-blur-md marketing-glow-ring">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                  <Percent className="h-4 w-4" />
                  Best single cut
                </div>
                <p className="mt-2 font-serif text-xl font-semibold">ManyVids ${BUNDLE_ADDONS.MV_FLAT}/mo</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Flat solo Focus at every band. Pair with OF or Fansly for fixed bundle pricing; see the matrix for
                  bundle savings vs solo lines.
                </p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.06] to-card/90 p-6 shadow-xl backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">Unified</p>
                <p className="mt-2 font-serif text-xl font-semibold">All three as one</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The full adult stack in a single workspace. Higher than OF-only — you&apos;re not comparing apples to
                  apples; you&apos;re buying the whole orchard.
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

      <section className="px-4 pb-6 sm:px-6">
        <MotionReveal className="mx-auto max-w-6xl rounded-3xl border border-border/60 bg-card/30 p-6 backdrop-blur-md sm:p-8">
          <h2 className="text-center font-serif text-lg font-semibold sm:text-xl">Savings at a glance (example band)</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            Mid-band “{sampleTier.label}” — your row will show precise numbers for your revenue tier.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SavingsGlanceCard label="Fansly vs OF" pct={FOCUS_PLATFORM_SAVINGS_PCT.fansly} fixedDiscount />
            <SavingsGlanceCard label="ManyVids solo vs OF" pct={mvSoloVsOfPct} fixedDiscount />
            <SavingsGlanceCard label="OF + Fansly (bundle)" pct={ofFlSavings} />
            <SavingsGlanceCard label="OF + ManyVids (bundle)" pct={ofMvSavings} />
            <SavingsGlanceCard label="Fansly + ManyVids (bundle)" pct={flMvSavings} />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Glance cards use % vs OnlyFans base for quick comparison. The full matrix below lists every bundle with
            savings vs solo lines.
          </p>
        </MotionReveal>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-8 text-center">
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Monthly price matrix (USD)</h2>
            <p className="mt-2 text-sm text-muted-foreground">Excludes taxes. Checkout in-app after sign-up.</p>
          </MotionReveal>

          <MotionReveal>
            <div className="overflow-hidden rounded-3xl border border-primary/25 bg-card/40 shadow-2xl backdrop-blur-md">
              <div className="marketing-rainbow-edge h-1 w-full opacity-90" />
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border/60 px-4 py-3 text-xs text-muted-foreground sm:px-6">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  Green: bundle savings vs buying each included line solo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-fuchsia-300" aria-hidden>
                    ●
                  </span>
                  Unified (all 3) — best total value
                </span>
              </div>
              <div className="overflow-x-auto">
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
            </div>
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
                Already in — Billing
              </Button>
            </Link>
          </MotionReveal>
        </div>
      </section>

      <section className="border-y border-border/40 bg-card/20 px-4 py-16 backdrop-blur-sm sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Trial vs paid</h2>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <div className="mt-10 overflow-hidden rounded-2xl border border-border/60">
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

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <MotionReveal className="mb-10 text-center">
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
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Lock the price. Keep the magic.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              You’re not buying software — you’re buying time, nerve, and a voice that actually runs the machine.
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
