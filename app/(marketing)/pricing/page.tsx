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
  focusFanslyUsd,
  MANYVIDS_FOCUS_SINGLE_FLAT_USD,
  twoPlatformFocusUsd,
  percentVsOnlyFansBase,
  percentSavingsTwoPlatformFocus,
  FOCUS_PLATFORM_SAVINGS_PCT,
} from '@/lib/pricing-matrix'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { PriceWithSavings } from '@/components/marketing/pricing-table-cells'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { PricingJsonLd } from '@/components/marketing/pricing-json-ld'
import { getCanonicalUrl } from '@/lib/site-url'
import { cn } from '@/lib/utils'

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

const PRICING_DESCRIPTION =
  'Revenue-based pricing: Fansly line −10% vs OF base (capped at $200/mo); ManyVids solo Focus $39/mo any tier; pair lines use bundle math; Unified for all three. Per-seat billing for multiple managers. Calculator + matrix. 14-day trial.'

export const metadata: Metadata = {
  title: 'Pricing | Circe et Venus',
  description: PRICING_DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | Circe et Venus',
    description: PRICING_DESCRIPTION,
    url: getCanonicalUrl('/pricing'),
    type: 'website',
    siteName: 'Circe et Venus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Circe et Venus',
    description: PRICING_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  keywords: [
    'creator pricing',
    'OnlyFans tools pricing',
    'Fansly pricing',
    'ManyVids',
    'revenue-based subscription',
    'Circe et Venus',
    'creator SaaS',
    'Focus plan',
    'Unified plan',
  ],
}

export default function PricingPage() {
  const sampleTier = REVENUE_TIERS[4]
  const ofFlSavings = percentSavingsTwoPlatformFocus(sampleTier, 'onlyfans', 'fansly')
  const ofMvSavings = percentSavingsTwoPlatformFocus(sampleTier, 'onlyfans', 'manyvids')
  const flMvSavings = percentSavingsTwoPlatformFocus(sampleTier, 'fansly', 'manyvids')

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
      question: 'What do the “% vs OF” labels mean?',
      answer:
        'OnlyFans Focus price is our base for each revenue band. Every other column shows how that month’s price compares: green means you pay less than the OF base for the same band; amber on Unified means you pay more than OF-only because you’re billing the full three-platform workspace.',
    },
    {
      question: 'What is Focus vs Unified?',
      answer:
        'Focus covers one or two adult platforms (OnlyFans, Fansly, ManyVids). OnlyFans is the price base; Fansly is 10% lower and ManyVids 25% lower at each band. For two platforms we add those two line prices, then apply: OnlyFans + Fansly → 10% off the sum; OnlyFans + ManyVids → 25% off the sum; Fansly + ManyVids → 5% on top of the sum. All three platforms bill as Unified at the original multi-platform price for your band.',
    },
    {
      question: 'Which single platform is the best discount?',
      answer:
        'At every band, ManyVids Focus is 25% below the OnlyFans base — the deepest single-platform cut. Fansly is 10% below base.',
    },
    {
      question: 'What about two-platform pairs?',
      answer:
        `Example at the “${sampleTier.label}” band vs OnlyFans-only: OnlyFans + Fansly is about ${ofFlSavings >= 0 ? `${ofFlSavings}% lower` : `${-ofFlSavings}% higher`}; OnlyFans + ManyVids about ${ofMvSavings >= 0 ? `${ofMvSavings}% lower` : `${-ofMvSavings}% higher`}; Fansly + ManyVids about ${flMvSavings >= 0 ? `${flMvSavings}% lower` : `${-flMvSavings}% higher`} — green “% vs OF” in the matrix means you pay less than OF base; amber means more. Rounding can vary by $1 at some bands.`,
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
        'Right now you choose your revenue band at checkout and can change it anytime in Settings → Billing. Automatic band reviews (for example, aligning your next bill after revenue crosses a new threshold) are planned; until then, update your band in-app if your business has moved up.',
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
              <p>Every cell shows the monthly USD price and its savings (or premium) versus OnlyFans base in that band.</p>
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
                  Stack discounts: Fansly −{FOCUS_PLATFORM_SAVINGS_PCT.fansly}%, ManyVids −{FOCUS_PLATFORM_SAVINGS_PCT.manyvids}% vs
                  OnlyFans base. Two picks → sum of line prices, then pair rule (OF+FL −10%, OF+MV −25%, FL+MV +5%).
                </p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/[0.12] to-card/90 p-6 shadow-xl backdrop-blur-md marketing-glow-ring">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                  <Percent className="h-4 w-4" />
                  Best single cut
                </div>
                <p className="mt-2 font-serif text-xl font-semibold">ManyVids −25%</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Deepest per-platform discount vs OF base. Pair it with OF or Fansly and the matrix shows the exact
                  % vs OF for that bundle at each band.
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
            <SavingsGlanceCard label="ManyVids vs OF" pct={FOCUS_PLATFORM_SAVINGS_PCT.manyvids} fixedDiscount />
            <SavingsGlanceCard label="OF + Fansly (bundle)" pct={ofFlSavings} />
            <SavingsGlanceCard label="OF + ManyVids (bundle)" pct={ofMvSavings} />
            <SavingsGlanceCard label="Fansly + ManyVids (bundle)" pct={flMvSavings} />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Two-platform bundles can be above OnlyFans-only base; the matrix uses green for cheaper than OF and amber
            for more. See the full table below.
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-4 text-left font-serif font-semibold">Monthly revenue</th>
                      <th className="p-4 text-right font-medium">OnlyFans</th>
                      <th className="p-4 text-right font-medium">Fansly</th>
                      <th className="p-4 text-right font-medium">ManyVids</th>
                      <th className="p-4 text-right font-medium">Focus OF+FL</th>
                      <th className="p-4 text-right font-medium">Unified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REVENUE_TIERS.map((row) => {
                      const fl = focusFanslyUsd(row)
                      const mv = MANYVIDS_FOCUS_SINGLE_FLAT_USD
                      const ofFl = twoPlatformFocusUsd(row, 'onlyfans', 'fansly')
                      const unifiedPct = percentVsOnlyFansBase(row, row.multiPriceUsd)
                      return (
                        <tr
                          key={row.tierIndex}
                          className="border-b border-border/40 transition-colors hover:bg-muted/20"
                        >
                          <td className="p-4 text-muted-foreground">{row.label}</td>
                          <td className="p-4 text-right">
                            <PriceWithSavings row={row} usd={row.focusBaseUsd} baseline="of" />
                          </td>
                          <td className="p-4 text-right">
                            <PriceWithSavings row={row} usd={fl} />
                          </td>
                          <td className="p-4 text-right">
                            <PriceWithSavings row={row} usd={mv} />
                          </td>
                          <td className="p-4 text-right">
                            <PriceWithSavings row={row} usd={ofFl} />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-base font-bold tabular-nums text-primary sm:text-lg">
                                ${row.multiPriceUsd}
                              </span>
                              <span className="text-[10px] font-medium text-amber-300/90 sm:text-xs">
                                {unifiedPct < 0 ? `+${-unifiedPct}% vs OF · 3 platforms` : '—'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
