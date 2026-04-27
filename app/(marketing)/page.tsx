import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { MarketingBrandLogo } from '@/components/marketing/marketing-brand-logo'
import { ArrowRight, Shield, TrendingUp, Moon, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo/marketing-metadata'
import { buildHomePricingTeaserLine } from '@/lib/seo/pricing-seo'
import { MarketingModeProvider } from '@/components/marketing/marketing-mode-context'
import { ProModeToggle } from '@/components/marketing/pro-mode-toggle'
import { HomePricingSwitch } from '@/components/marketing/home-pricing-switch'

const HOME_DESC = `Circe et Venus is a creator workspace for OnlyFans and Fansly: messages, fans, AI tools, and protection in one dashboard — with voice-first Divine Manager. ${PRICING_MODEL_TRIAL_LINE} ${buildHomePricingTeaserLine()}`

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

          <MotionReveal delay={0.1}>
            <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-amber-200 via-primary to-circe-light/70 bg-clip-text text-transparent">
                Earn More,
              </span>{' '}
              Run Smarter,{' '}
              <span className="bg-gradient-to-r from-circe-light via-fuchsia-300 to-primary/70 bg-clip-text text-transparent">
                Grow Faster.
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl">
              Get AI management for your daily operations. Protect your content with faster response workflows.
              Seamlessly run OnlyFans and Fansly in one dashboard.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
              {[
                {
                  name: 'OnlyFans',
                  logoSrc: '/onlyfans-logo.png',
                  delay: '0s',
                  /** 25% larger than prior 37.5px; overflows fixed pill via slot + overflow-visible */
                  logoSizePx: 37.5 * 1.25,
                  markBadge:
                    'bg-sky-950/45 ring-1 ring-sky-400/35 shadow-[0_0_20px_-6px_rgba(56,189,248,0.5),0_0_10px_-4px_rgba(14,165,233,0.35)]',
                },
                {
                  name: 'Fansly',
                  mark: 'F',
                  logoSrc: '/fansly-logo.png',
                  delay: '0.9s',
                  logoSizePx: 37.5,
                  markBadge:
                    'bg-violet-950/50 ring-1 ring-violet-400/40 shadow-[0_0_20px_-6px_rgba(139,92,246,0.55),0_0_10px_-4px_rgba(167,139,250,0.35)]',
                },
              ].map((platform) => {
                const logoPx = platform.logoSizePx
                const logoCss = `${logoPx}px`
                /** Layout slot (ring) stays small so a larger logo can extend past the pill height */
                const badgeSlotPx = 40
                return (
                <div
                  key={platform.name}
                  className="marketing-float group relative flex h-11 max-h-11 min-h-11 shrink-0 items-center gap-2.5 overflow-visible rounded-full border border-primary/25 bg-card/60 px-3 backdrop-blur-sm"
                  style={{ animationDelay: platform.delay }}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span
                    className={`relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-full text-[10px] font-semibold text-foreground ${platform.markBadge}`}
                    style={{
                      width: badgeSlotPx,
                      height: badgeSlotPx,
                      minWidth: badgeSlotPx,
                      minHeight: badgeSlotPx,
                    }}
                  >
                    {platform.logoSrc ? (
                      <Image
                        src={platform.logoSrc}
                        alt={`${platform.name} logo`}
                        width={Math.round(logoPx)}
                        height={Math.round(logoPx)}
                        className="pointer-events-none absolute left-1/2 top-1/2 z-10 max-h-none max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
                        style={{ width: logoCss, height: logoCss }}
                      />
                    ) : (
                      platform.mark
                    )}
                  </span>
                  <span className="relative text-xs font-medium text-foreground/90 sm:text-sm">
                    Compatible with <span className="text-primary">{platform.name}</span>
                  </span>
                </div>
                )
              })}
            </div>
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
            <p className="mt-3 text-xs text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
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
              <div className="group relative h-full overflow-hidden rounded-3xl border border-circe/45 bg-gradient-to-br from-circe/[0.14] via-card/80 to-circe/[0.06] p-8 shadow-xl shadow-circe/10 ring-1 ring-inset ring-circe/15 transition-all duration-500 hover:border-circe/70 hover:shadow-[0_0_0_1px_oklch(0.55_0.2_295/0.35),0_0_48px_-12px_oklch(0.55_0.2_295/0.28)]">
                <div
                  className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-circe/25 blur-3xl transition-opacity duration-500 group-hover:bg-circe/35"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-circe-light/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden
                />
                <div className="absolute right-4 top-4 text-circe/20 transition-all duration-500 group-hover:scale-110 group-hover:text-circe/30">
                  <Moon className="h-24 w-24" aria-hidden />
                </div>
                <div className="relative">
                  <div className="mb-5 inline-flex rounded-2xl border border-circe/35 bg-circe/30 p-4 text-circe-light shadow-[0_0_28px_-6px_oklch(0.55_0.2_295/0.45)] ring-2 ring-circe/25 circe-glow">
                    <Shield className="h-8 w-8" aria-hidden />
                  </div>
                  <h3 className="mb-2 font-serif text-2xl font-semibold tracking-tight text-circe-light sm:text-[1.65rem]">
                    Circe
                  </h3>
                  <p className="mb-1 text-sm font-semibold leading-snug text-circe-light/95 sm:text-base">
                    Keep fans enchanted — and thieves frustrated.
                  </p>
                  <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-circe/75">Retention · leaks · nuance</p>
                  <ul className="space-y-3.5 text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]">
                    {[
                      'Churn radar: who’s cooling off before they ghost you',
                      'Leak defense with DMCA-ready drafts — less doom-scrolling, more doing',
                      'Fan context that reads the room — warmer replies, fewer misreads',
                    ].map((t) => (
                      <li key={t} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-circe-light shadow-[0_0_10px_oklch(0.72_0.12_295/0.7)]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-primary/45 bg-gradient-to-br from-primary/[0.12] via-card/80 to-fuchsia-500/[0.12] p-8 shadow-xl shadow-primary/15 ring-1 ring-inset ring-fuchsia-500/15 transition-all duration-500 hover:border-primary/70 hover:shadow-[0_0_0_1px_oklch(0.78_0.14_85/0.35),0_0_52px_-10px_oklch(0.78_0.14_85/0.22),0_0_40px_-14px_oklch(0.6_0.22_310/0.2)]">
                <div
                  className="pointer-events-none absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-fuchsia-500/20 blur-3xl transition-opacity duration-500 group-hover:bg-fuchsia-500/28"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -left-12 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-2xl transition-opacity duration-500 group-hover:bg-primary/22"
                  aria-hidden
                />
                <div className="absolute right-4 top-4 text-primary/20 transition-all duration-500 group-hover:scale-110 group-hover:text-primary/35">
                  <Sun className="h-24 w-24" aria-hidden />
                </div>
                <div className="relative">
                  <div className="mb-5 inline-flex rounded-2xl border border-amber-400/35 bg-gradient-to-br from-primary/25 to-fuchsia-500/20 p-4 text-primary shadow-[0_0_28px_-6px_oklch(0.78_0.14_85/0.45),0_0_20px_-8px_oklch(0.6_0.22_310/0.25)] ring-2 ring-primary/25 gold-glow">
                    <TrendingUp className="h-8 w-8" aria-hidden />
                  </div>
                  <h3 className="mb-2 font-serif text-2xl font-semibold tracking-tight text-primary sm:text-[1.65rem]">
                    Venus
                  </h3>
                  <p className="mb-1 text-sm font-semibold leading-snug text-foreground/95 sm:text-base">
                    Turn attention into momentum — without the hustle hangover.
                  </p>
                  <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/90">
                    Growth · mentions · momentum
                  </p>
                  <ul className="space-y-3.5 text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]">
                    {[
                      'Fan CRM with heat & spend signals — know who earns your focus',
                      'Mentions & reputation briefings that surface drama before it spreads',
                      'Comment & list bulk moves — batch the boring, stay magnetic',
                    ].map((t) => (
                      <li key={t} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_oklch(0.78_0.14_85/0.65)]" />
                        <span>{t}</span>
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
