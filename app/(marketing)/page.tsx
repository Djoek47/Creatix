import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LandingPricingSection } from '@/components/marketing/landing-pricing-section'
import { PRICING_MODEL_TRIAL_LINE, CREDIT_ALLOWANCE_MARKETING_LINE } from '@/lib/marketing/pricing-copy'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { MarketingBrandLogo } from '@/components/marketing/marketing-brand-logo'
import {
  ArrowRight,
  Shield,
  TrendingUp,
  BarChart3,
  Users,
  Sparkles,
  Moon,
  Sun,
  Mic,
  MessageSquare,
} from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildHomePricingTeaserLine } from '@/lib/seo/pricing-seo'

const HOME_DESC = `Circe et Venus is a creator workspace for OnlyFans and Fansly: messages, fans, AI tools, and protection in one dashboard — with voice-first Divine Manager. 14-day trial. ${buildHomePricingTeaserLine()}`

export const metadata: Metadata = {
  ...buildPublicMetadata({
    path: '/',
    title: 'Circe et Venus — Creator workspace for OnlyFans & Fansly',
    description: HOME_DESC,
    keywords: [
      'creator OS',
      'OnlyFans manager',
      'Fansly',
      'ManyVids',
      'Divine Manager',
      'AI for creators',
      'fan retention',
      'creator analytics',
      'Circe et Venus',
      'Creatix',
    ],
  }),
  title: { absolute: 'Circe et Venus — Creator workspace for OnlyFans & Fansly' },
}

export default function LandingPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/15 via-circe/10 to-transparent blur-3xl" />
        <div className="mx-auto max-w-5xl text-center">
          <MotionReveal>
            <div className="mb-8 flex justify-center">
              <MarketingBrandLogo
                width={200}
                height={200}
                className="h-36 w-36 sm:h-48 sm:w-48"
                variant="hero"
                priority
              />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.06}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-gradient-to-r from-primary/10 via-circe/10 to-fuchsia-500/10 px-5 py-2 text-sm font-medium text-primary shadow-lg shadow-primary/5">
              <Mic className="h-4 w-4" aria-hidden />
              Voice or text · Divine Manager
              <Sparkles className="h-4 w-4 text-circe-light" aria-hidden />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              One workspace for{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                fans, DMs, and revenue
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
              Connect OnlyFans or Fansly. Manage messages and subscribers, run AI where it helps, and keep leaks and
              reputation under control — without juggling five tabs and spreadsheets.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              {CREDIT_ALLOWANCE_MARKETING_LINE}
            </p>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-base text-primary-foreground shadow-xl shadow-primary/25 hover:opacity-[0.97]"
                >
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-primary/40 px-10 text-base hover:bg-primary/10"
                >
                  How it works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">What you use it for</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Three clear jobs — everything else in the app supports these.
            </p>
          </MotionReveal>
          <MotionStagger className="grid gap-6 md:grid-cols-3" stagger={0.08}>
            <MotionStaggerItem>
              <div className="h-full rounded-2xl border border-primary/25 bg-card/50 p-6 text-left backdrop-blur-sm">
                <MessageSquare className="h-8 w-8 text-primary" aria-hidden />
                <h3 className="mt-4 font-serif text-xl font-semibold">Messages and fans</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unified inbox, CRM-style fan context, and tools that respect platform rules — so you reply with
                  context, not guesswork.
                </p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="h-full rounded-2xl border border-circe/30 bg-card/50 p-6 text-left backdrop-blur-sm">
                <Mic className="h-8 w-8 text-circe-light" aria-hidden />
                <h3 className="mt-4 font-serif text-xl font-semibold">Voice-first control</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Divine Manager routes what you say into the right screen: drafts, scans, and navigation — you stay in
                  charge of sends and publishes.
                </p>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="h-full rounded-2xl border border-fuchsia-500/25 bg-card/50 p-6 text-left backdrop-blur-sm">
                <Shield className="h-8 w-8 text-fuchsia-300" aria-hidden />
                <h3 className="mt-4 font-serif text-xl font-semibold">Protection and growth</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Retention signals, analytics, leak workflows, and mentions — built for adult creators, not generic
                  “social suites.”
                </p>
              </div>
            </MotionStaggerItem>
          </MotionStagger>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Divine Manager</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              One entry point for voice and chat — wired to your connected accounts and tools inside the dashboard.
            </p>
          </MotionReveal>
          <MotionReveal>
            <DivineCommandCenter />
          </MotionReveal>
        </div>
      </section>

      <section id="ai-goddesses" className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
              Circe and Venus — <span className="text-primary">same product, clear roles</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Circe leans toward retention and protection. Venus leans toward fans and growth. Both use your live data
              when platforms are connected.
            </p>
          </MotionReveal>

          <MotionStagger className="mt-12 grid gap-8 lg:grid-cols-2" stagger={0.12}>
            <MotionStaggerItem>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-circe/35 bg-gradient-to-br from-circe/[0.12] via-card/80 to-transparent p-8 shadow-xl transition-all duration-500 hover:border-circe/55 hover:shadow-circe/20">
                <div className="absolute right-4 top-4 text-circe/15 transition-transform duration-500 group-hover:scale-110">
                  <Moon className="h-24 w-24" aria-hidden />
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-2xl bg-circe/25 p-4 text-circe-light circe-glow">
                    <Shield className="h-8 w-8" aria-hidden />
                  </div>
                  <h3 className="mb-1 font-serif text-2xl font-semibold text-circe-light">Circe</h3>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-circe/80">
                    Retention and protection
                  </p>
                  <p className="mb-6 text-muted-foreground">
                    Churn and income context, leak monitoring, and workflows you approve — fewer surprises in your
                    revenue and brand.
                  </p>
                  <ul className="space-y-3 text-sm text-foreground/85">
                    {['Retention and risk signals', 'Leak detection and DMCA drafts (review before send)', 'Fan context that respects nuance'].map(
                      (t) => (
                        <li key={t} className="flex items-center gap-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-circe-light" />
                          {t}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card/80 to-fuchsia-500/[0.06] p-8 shadow-xl transition-all duration-500 hover:border-primary/50 hover:shadow-primary/15">
                <div className="absolute right-4 top-4 text-primary/15 transition-transform duration-500 group-hover:scale-110">
                  <Sun className="h-24 w-24" aria-hidden />
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-2xl bg-primary/20 p-4 text-primary gold-glow">
                    <TrendingUp className="h-8 w-8" aria-hidden />
                  </div>
                  <h3 className="mb-1 font-serif text-2xl font-semibold text-primary">Venus</h3>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Fans and growth
                  </p>
                  <p className="mb-6 text-muted-foreground">
                    CRM, segments, mentions, and engagement surfaces — so you know who to talk to and what to post next.
                  </p>
                  <ul className="space-y-3 text-sm text-foreground/85">
                    {['Fan CRM and spend signals', 'Mentions and reputation', 'Comment and list workflows (review-first)'].map((t) => (
                      <li key={t} className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </MotionStaggerItem>
          </MotionStagger>
        </div>
      </section>

      <section className="border-y border-border/40 bg-card/15 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Optional</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">Content calendar with timing hints</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              If astrology fits your brand, you can layer moon and transit hints on your schedule. If not, use the
              calendar as a straightforward posting plan.
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Built for daily creator work</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              A short map of the dashboard — details live on Features.
            </p>
          </MotionReveal>
          <MotionStagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {[
              { icon: Users, title: 'Fan CRM', body: 'Segments, spend, and who to message first.', edge: 'circe' },
              { icon: Sparkles, title: 'AI Studio', body: 'Captions, bundles, scans — credits shown per tool.', edge: 'primary' },
              { icon: BarChart3, title: 'Analytics', body: 'Revenue and activity from synced data.', edge: 'venus' },
              { icon: Shield, title: 'Protection', body: 'Leak alerts and takedown drafts you control.', edge: 'circe' },
              { icon: TrendingUp, title: 'Growth', body: 'Mentions and hooks for what to push next.', edge: 'primary' },
              { icon: Mic, title: 'Voice or type', body: 'Same Divine Manager — use what is faster.', edge: 'circe' },
            ].map((f) => (
              <MotionStaggerItem key={f.title}>
                <div
                  className={`group h-full rounded-2xl border bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    f.edge === 'circe'
                      ? 'border-circe/25 hover:border-circe/50 hover:shadow-circe/10'
                      : f.edge === 'venus'
                        ? 'border-primary/25 hover:border-primary/50'
                        : 'border-primary/20 hover:border-primary/45 hover:shadow-primary/10'
                  }`}
                >
                  <div
                    className={`mb-4 inline-flex rounded-xl p-3 ${
                      f.edge === 'circe' ? 'bg-circe/15 text-circe-light' : 'bg-primary/15 text-primary'
                    }`}
                  >
                    <f.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mb-2 font-serif text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <LandingPricingSection />

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <MotionReveal className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-circe/[0.08] via-card to-primary/[0.06] p-10 text-center shadow-2xl sm:p-14">
          <div className="marketing-rainbow-edge mx-auto mb-8 h-1 max-w-xs rounded-full opacity-90" />
          <MarketingBrandLogo width={88} height={88} className="mx-auto" variant="header" />
          <h2 className="mt-6 font-serif text-3xl font-semibold sm:text-4xl">See it on your accounts</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Start the trial, connect a platform, and open Divine Manager. Pricing stays transparent — pick your revenue
            band and platforms on the Pricing page anytime.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
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
                All features
              </Button>
            </Link>
          </div>
        </MotionReveal>
      </section>
    </main>
  )
}
