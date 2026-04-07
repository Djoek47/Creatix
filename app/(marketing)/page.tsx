import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemedLogo } from '@/components/themed-logo'
import { LandingPricingSection } from '@/components/marketing/landing-pricing-section'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import {
  ArrowRight,
  Shield,
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  Sparkles,
  Star,
  Moon,
  Sun,
  Mic,
} from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildHomePricingTeaserLine } from '@/lib/seo/pricing-seo'

const HOME_DESC =
  `Voice-first Divine Manager, Circe for retention & protection, Venus for growth. AI, analytics, OnlyFans, Fansly & adult creator tools in one workspace — sign up for a 14-day trial. ${buildHomePricingTeaserLine()}`

export const metadata: Metadata = {
  ...buildPublicMetadata({
    path: '/',
    title: 'Circe et Venus — Divine creator OS',
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
  title: { absolute: 'Circe et Venus — Divine creator OS' },
}

export default function LandingPage() {
  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-16 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/15 via-circe/10 to-transparent blur-3xl" />
        <div className="mx-auto max-w-5xl text-center">
          <MotionReveal>
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="marketing-hero-halo absolute inset-0 scale-150 rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-primary/25 to-circe/30 blur-2xl" />
                <ThemedLogo
                  width={200}
                  height={200}
                  className="relative z-10 h-36 w-36 rounded-full sm:h-48 sm:w-48 marketing-float gold-glow"
                  priority
                />
              </div>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.06}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-gradient-to-r from-primary/10 via-circe/10 to-fuchsia-500/10 px-5 py-2 text-sm font-medium text-primary shadow-lg shadow-primary/5">
              <Mic className="h-4 w-4" />
              Voice-first · Divine Manager
              <Sparkles className="h-4 w-4 text-circe-light" />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Your empire.{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                One whisper
              </span>{' '}
              away.
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
              Circe et Venus is the mythic operating system for serious creators:{' '}
              <span className="text-foreground/90">speak</span> to the Divine Manager to run DMs, pricing, publishing,
              and analytics — or type if you prefer. Two goddesses, one cockpit, every platform you actually use.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-base text-primary-foreground shadow-xl shadow-primary/25 hover:opacity-[0.97]"
                >
                  Enter the pantheon <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-primary/40 px-10 text-base hover:bg-primary/10"
                >
                  See every power
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Command without the keyboard</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              The Divine Manager isn&apos;t a chatbot toy — it&apos;s wired into your real workflows. Be creative: ramble,
              flirt with the UI, give half-finished ideas. It meets you where you are.
            </p>
          </MotionReveal>
          <MotionReveal>
            <DivineCommandCenter />
          </MotionReveal>
        </div>
      </section>

      <section id="ai-goddesses" className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
              Two goddesses. <span className="text-primary">Zero drama.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Circe keeps the lovers you already have. Venus helps new ones find you. Both answer to you — and to your
              voice.
            </p>
          </MotionReveal>

          <MotionStagger className="mt-14 grid gap-8 lg:grid-cols-2" stagger={0.12}>
            <MotionStaggerItem>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-circe/35 bg-gradient-to-br from-circe/[0.12] via-card/80 to-transparent p-8 shadow-xl transition-all duration-500 hover:border-circe/55 hover:shadow-circe/20">
                <div className="absolute right-4 top-4 text-circe/15 transition-transform duration-500 group-hover:scale-110">
                  <Moon className="h-28 w-28" />
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-2xl bg-circe/25 p-4 text-circe-light circe-glow">
                    <Shield className="h-9 w-9" />
                  </div>
                  <h3 className="mb-1 font-serif text-2xl font-semibold text-circe-light">Circe</h3>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-circe/80">
                    Retention &amp; protection
                  </p>
                  <p className="mb-6 text-muted-foreground">
                    Churn signals, leak hunts, DMCA muscle, and the quiet confidence that your content isn&apos;t
                    wandering the web uninvited.
                  </p>
                  <ul className="space-y-3 text-sm text-foreground/85">
                    {['Retention analytics & risk alerts', 'Leak detection & takedowns', 'Fan CRM that respects nuance'].map(
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
                  <Sun className="h-28 w-28" />
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-2xl bg-primary/20 p-4 text-primary gold-glow">
                    <TrendingUp className="h-9 w-9" />
                  </div>
                  <h3 className="mb-1 font-serif text-2xl font-semibold text-primary">Venus</h3>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Growth &amp; attraction
                  </p>
                  <p className="mb-6 text-muted-foreground">
                    Acquisition plays, social listening, and the optics of desire — tuned for creators, not generic
                    brands.
                  </p>
                  <ul className="space-y-3 text-sm text-foreground/85">
                    {['Growth & reputation analytics', 'Cross-platform presence', 'Promotion timing & hooks'].map((t) => (
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

      <section className="border-y border-border/40 bg-card/20 px-4 py-16 backdrop-blur-sm sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <MotionReveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
                <Star className="h-4 w-4" />
                Cosmic rhythm (optional)
              </div>
              <h2 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">
                Post when the sky <span className="text-circe-light">agrees</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Layer astrology on your calendar if that&apos;s your brand — moons, transits, and timing hints that feel
                luxe, not gimmicky.
              </p>
            </MotionReveal>
            <MotionReveal delay={0.1}>
              <div className="relative aspect-square max-w-md overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-circe/10 via-transparent to-primary/10 p-10 marketing-glow-ring">
                <div className="marketing-rainbow-edge absolute inset-x-0 top-0 h-1 opacity-80" />
                <div className="flex h-full flex-col items-center justify-center">
                  <Calendar className="h-32 w-32 text-primary/40" />
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Angles, peaks, and “why today hits different” — surfaced for you, not generic horoscope spam.
                  </p>
                </div>
              </div>
            </MotionReveal>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Tools that feel <span className="text-primary">expensive</span></h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Everything ties back to revenue and peace of mind — not vanity dashboards.
            </p>
          </MotionReveal>
          <MotionStagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {[
              { icon: Users, title: 'Fan oracle', body: 'Spend, loyalty, and who actually matters tonight.', edge: 'circe' },
              { icon: Sparkles, title: 'AI studio', body: 'Chatter, captions, bundles — tuned to your voice.', edge: 'primary' },
              { icon: BarChart3, title: 'Revenue truth', body: 'See the story behind the numbers across platforms.', edge: 'venus' },
              { icon: Shield, title: 'Aegis', body: 'Leaks, scans, and the legal choreography handled.', edge: 'circe' },
              { icon: TrendingUp, title: 'Lift & leverage', body: 'Growth experiments with adult-native context.', edge: 'primary' },
              { icon: Mic, title: 'Speak-first UX', body: 'Drive the product with voice when your hands aren’t free.', edge: 'circe' },
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
                    <f.icon className="h-6 w-6" />
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

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <MotionReveal className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-circe/[0.08] via-card to-primary/[0.06] p-10 text-center shadow-2xl sm:p-14">
          <div className="marketing-rainbow-edge mx-auto mb-8 h-1 max-w-xs rounded-full opacity-90" />
          <ThemedLogo width={88} height={88} className="mx-auto rounded-full opacity-90" />
          <h2 className="mt-6 font-serif text-3xl font-semibold sm:text-4xl">Ready to be undeniable?</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Start the trial. Connect a platform. Say one sentence to the Divine Manager. Watch it actually do something.
          </p>
          <div className="mt-10">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="h-12 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-primary-foreground shadow-lg"
              >
                Begin your divine journey <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </MotionReveal>
      </section>
    </main>
  )
}
