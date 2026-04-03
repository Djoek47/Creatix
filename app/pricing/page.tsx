import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Moon,
  Sun,
  Check,
  Sparkles,
} from 'lucide-react'
import {
  REVENUE_TIERS,
  focusFanslyUsd,
  focusManyvidsUsd,
  twoPlatformFocusUsd,
} from '@/lib/pricing-matrix'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'

export const metadata = {
  title: 'Pricing | Circe et Venus',
  description:
    'Revenue-based pricing: Focus for 1–2 adult platforms (OnlyFans base, Fansly −10%, ManyVids −25%) or Unified for all three. 14-day free trial.',
}

export default function PricingPage() {
  const comparisonRows = [
    { feature: '14-day free trial', trial: true, paid: true },
    { feature: 'AI credits & storage', trial: 'Limited', paid: 'Unlimited (paid tiers)' },
    { feature: 'OnlyFans connection', trial: true, paid: true },
    { feature: 'Fansly / ManyVids', trial: true, paid: 'Focus (if included) or Unified' },
    { feature: 'Leak & reputation tools', trial: 'Limited', paid: true },
    { feature: 'Priority support', trial: false, paid: true },
  ]

  const faqs = [
    {
      question: 'What is Focus vs Unified?',
      answer:
        'Focus covers one or two adult platforms (OnlyFans, Fansly, ManyVids). OnlyFans is the price base; Fansly is 10% lower and ManyVids 25% lower at each band. If you pick two platforms, we charge the rounded average of those two prices (unless configured otherwise). Selecting all three platforms is billed as Unified at the original multi-platform price for your band.',
    },
    {
      question: 'How do revenue bands work?',
      answer:
        'You choose the monthly revenue range that best matches your creator business. Pricing scales from smaller creators to higher-volume accounts. See the table on this page for exact monthly prices.',
    },
    {
      question: 'How does the 14-day free trial work?',
      answer:
        'Start with limited trial limits. Upgrade anytime from Settings → Billing. Cancel before the trial ends if you do not want to continue.',
    },
    {
      question: 'Can I change plans later?',
      answer:
        'Yes. Use the in-app billing section to start checkout for a new band, Focus platform, or Unified. The Stripe customer portal handles payment methods and cancellation; changing tier or plan may use a new checkout session.',
    },
    {
      question: 'What platforms do you integrate with?',
      answer:
        'Adult: OnlyFans, Fansly, ManyVids. Social: Instagram, TikTok, X, and more for reputation and growth.',
    },
  ]

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background constellation-bg">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <ThemedLogo
              width={36}
              height={36}
              className="rounded-full sm:h-10 sm:w-10"
              priority
            />
            <span className="hidden font-serif text-lg font-semibold tracking-wider text-primary sm:inline sm:text-xl">
              CIRCE ET VENUS
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/features">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                Features
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 sm:pt-16">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-circe/10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <Badge className="mb-4 gap-1">
                <Sparkles className="h-3 w-3" />
                14-Day Free Trial
              </Badge>
              <PricingModelHeadline as="h1" />
              <div className="mx-auto mt-4 max-w-2xl space-y-3 text-lg text-muted-foreground">
                <PricingModelInlineBlurb />
                <p className="text-base">
                  All paid tiers include full Pro feature access within fair-use limits.
                </p>
              </div>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/20 bg-card/60 p-5 text-left shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Focus</p>
                <p className="mt-2 font-serif text-lg font-semibold text-foreground">1–2 platforms</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick OnlyFans, Fansly, and/or ManyVids — up to two on Focus. Three selections bill as Unified.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-card p-5 text-left shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Savings
                </p>
                <p className="mt-2 font-serif text-lg font-semibold text-foreground">Derived from OF base</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fansly ≈ 10% below base; ManyVids ≈ 25% below. Two-platform Focus uses the mean of the two prices
                  (rounded).
                </p>
              </div>
              <div className="rounded-2xl border border-circe/25 bg-gradient-to-br from-circe/5 to-card p-5 text-left shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-circe-light">Unified</p>
                <p className="mt-2 font-serif text-lg font-semibold text-foreground">All three together</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Original multi-platform price per revenue band — unchanged from the classic bundle.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Monthly price (USD)</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Excludes taxes. Exact checkout in the app after sign-up.
              </p>
            </div>
            <div className="-mx-4 overflow-hidden rounded-2xl border border-border bg-card/40 shadow-lg backdrop-blur-sm sm:mx-0">
              <div className="overflow-x-auto px-4 py-2 sm:px-0 sm:py-0">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-4 text-left font-medium font-serif">Monthly revenue</th>
                      <th className="p-4 text-right font-medium">OF base</th>
                      <th className="p-4 text-right font-medium">Fansly</th>
                      <th className="p-4 text-right font-medium">ManyVids</th>
                      <th className="p-4 text-right font-medium">Focus ×2 (OF+FL)</th>
                      <th className="p-4 text-right font-medium">Unified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REVENUE_TIERS.map((row) => (
                      <tr key={row.tierIndex} className="border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="p-4 text-muted-foreground">{row.label}</td>
                        <td className="p-4 text-right font-medium tabular-nums">${row.focusBaseUsd}</td>
                        <td className="p-4 text-right font-medium tabular-nums">${focusFanslyUsd(row)}</td>
                        <td className="p-4 text-right font-medium tabular-nums">${focusManyvidsUsd(row)}</td>
                        <td className="p-4 text-right font-medium tabular-nums">
                          ${twoPlatformFocusUsd(row, 'onlyfans', 'fansly')}
                        </td>
                        <td className="p-4 text-right font-semibold tabular-nums text-primary">${row.multiPriceUsd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/settings?tab=billing">
                <Button size="lg" variant="outline" className="px-8">
                  Already have an account — Billing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl font-serif">
              Trial vs paid
            </h2>
            <div className="mt-10 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-4 text-left">Feature</th>
                    <th className="p-4 text-center">Trial</th>
                    <th className="p-4 text-center">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b border-border/50">
                      <td className="p-4">{row.feature}</td>
                      <td className="p-4 text-center">
                        {typeof row.trial === 'boolean' ? (
                          row.trial ? (
                            <Check className="mx-auto h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">{row.trial}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.paid === 'boolean' ? (
                          row.paid ? (
                            <Check className="mx-auto h-5 w-5 text-primary" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span>{row.paid}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl font-serif">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-circe/5 via-card to-amber-500/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center gap-4">
              <div className="rounded-full bg-circe/20 p-3">
                <Moon className="h-8 w-8 text-circe-light" />
              </div>
              <div className="rounded-full bg-amber-500/20 p-3">
                <Sun className="h-8 w-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl font-serif">
              Ready to Start Your Divine Journey?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join creators who use Circe et Venus to grow and protect their business.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg" className="px-8">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/30 bg-card/30 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <ThemedLogo width={32} height={32} className="rounded-full" />
              <span className="font-serif font-semibold tracking-wider text-primary">CIRCE ET VENUS</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 text-sm sm:gap-6">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link href="/features" className="text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">
                How It Works
              </Link>
            </nav>
          </div>
          <FooterSupportSocial className="mt-6" />
          <div className="mt-6 border-t border-border/30 pt-6 text-center">
            <p className="text-sm text-muted-foreground">MMXXVI Circe et Venus Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
