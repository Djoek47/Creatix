import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LandingPricingSection } from '@/components/marketing/landing-pricing-section'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { MarketingBrandLogo } from '@/components/marketing/marketing-brand-logo'
import { ArrowRight, Shield, TrendingUp, Moon, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildHomePricingTeaserLine } from '@/lib/seo/pricing-seo'
import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { MarketingModeProvider, useMarketingMode } from '@/components/marketing/marketing-mode-context'
import { ProModeToggle } from '@/components/marketing/pro-mode-toggle'

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

function HomePricingSwitch() {
  const { mode } = useMarketingMode()
  if (mode === 'pro') return <LandingPricingSection />
  const fromPrice = PRICING_TIERS[0]?.prices.of ?? 39

  return (
    <section id="pricing" className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">From ${fromPrice}/mo</h2>
        <p className="mt-3 text-muted-foreground">Price follows your monthly revenue band.</p>
        <div className="mt-8 flex justify-center">
          <Link href="/pricing">
            <Button size="lg" className="h-12 gap-2 rounded-full px-10">
              See pricing <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
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

          <MotionReveal delay={0.1}>
            <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              One workspace for{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                fans, DMs, and revenue
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl">
              OnlyFans and Fansly in one dashboard. Voice-first AI. You stay in control.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <div className="mt-10 flex justify-center">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-circe/90 px-10 text-base text-primary-foreground shadow-xl shadow-primary/25 hover:opacity-[0.97]"
                >
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-8 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Speak. It runs.</h2>
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
              Circe <span className="text-muted-foreground">&</span> <span className="text-primary">Venus</span>
            </h2>
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
                  <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-circe/80">
                    Retention & protection
                  </p>
                  <ul className="space-y-3 text-sm text-foreground/85">
                    {['Retention and risk signals', 'Leak detection & DMCA drafts', 'Fan context that respects nuance'].map(
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
                  <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Fans & growth
                  </p>
                  <ul className="space-y-3 text-sm text-foreground/85">
                    {['Fan CRM and spend signals', 'Mentions and reputation', 'Comment & list workflows'].map((t) => (
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

      <MarketingModeProvider>
        <section className="px-4 pb-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl justify-end">
            <ProModeToggle className="mb-4" />
          </div>
        </section>
        <HomePricingSwitch />
      </MarketingModeProvider>
    </main>
  )
}

