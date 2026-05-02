import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { DivineCommandCenter } from '@/components/marketing/divine-command-center'
import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { MarketingBrandLogo } from '@/components/marketing/marketing-brand-logo'
import { ArrowRight, Shield, TrendingUp, Moon, Sun } from 'lucide-react'
import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { MarketingModeProvider } from '@/components/marketing/marketing-mode-context'
import { ProModeToggle } from '@/components/marketing/pro-mode-toggle'
import { HomePricingSwitch } from '@/components/marketing/home-pricing-switch'
import { HomeHeroUpcoming } from '@/components/marketing/home-hero-upcoming'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getPricingSeoInterpolation } from '@/lib/seo/pricing-seo'
import { fmtUsd } from '@/lib/marketing/fmt-usd'
import { cn } from '@/lib/utils'

type PageProps = { params: Promise<{ locale: string }> }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const seo = getPricingSeoInterpolation()
  const pricingTeaser = t('pricing.seo.homeTeaser', {
    minOfPrice: fmtUsd(seo.minOf),
    maxBundledPrice: fmtUsd(seo.maxBundled),
    protectionPrice: fmtUsd(seo.prot),
  })
  const description = t('home.meta.description', {
    body: t('home.meta.body'),
    trialLine: t('pricing.model.trialLine'),
    pricingTeaser,
  })
  const keywords = asStringArray(t.raw('home.meta.keywords'))

  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/',
    title: t('home.meta.title'),
    description,
    keywords,
  })
}

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })

  const platforms = [
    {
      name: 'OnlyFans',
      logoSrc: ONLYFANS_LOGO_SRC,
      delay: '0s',
      logoWidthPx: 200,
      logoHeightPx: 52,
    },
    {
      name: 'Fansly',
      logoSrc: FANSLY_LOGO_SRC,
      delay: '0.9s',
      logoWidthPx: 180,
      logoHeightPx: 52,
    },
  ] as const

  const circeBullets = [0, 1, 2].map((i) => t(`home.goddesses.circeBullets.${i}`))
  const venusBullets = [0, 1, 2].map((i) => t(`home.goddesses.venusBullets.${i}`))

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
            <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-amber-200 via-primary to-circe-light/70 bg-clip-text text-transparent">
                {t('home.hero.headlineEarnMore')}
              </span>{' '}
              {t('home.hero.headlineRunSmarter')}{' '}
              <span className="bg-gradient-to-r from-circe-light via-fuchsia-300 to-primary/70 bg-clip-text text-transparent">
                {t('home.hero.headlineGrowFaster')}
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl">
              {t('home.hero.subhead')}
            </p>
          </MotionReveal>

          <MotionReveal delay={0.16}>
            <div className="relative mx-auto mt-8 max-w-2xl sm:mt-10">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[min(100%,420px)] w-[min(100%,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary/20 via-circe/12 to-transparent blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col items-center">
                <Link href="/auth/sign-up" className="inline-flex">
                  <Button
                    size="lg"
                    className="h-12 gap-2.5 rounded-full bg-gradient-to-r from-primary to-circe/90 px-11 text-base font-semibold text-primary-foreground shadow-[0_22px_48px_-14px] shadow-primary/40 ring-1 ring-foreground/10 transition-[opacity,transform] hover:opacity-[0.97] active:scale-[0.99] sm:h-14 sm:gap-3 sm:px-14 sm:text-lg sm:shadow-[0_28px_56px_-16px] sm:shadow-primary/45"
                  >
                    {t('home.hero.ctaTrial')}{' '}
                    <ArrowRight className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
                  </Button>
                </Link>
                <p className="mt-4 max-w-md text-pretty text-center text-xs leading-relaxed text-muted-foreground sm:mt-3.5 sm:text-sm">
                  {t('pricing.model.trialLine')}
                </p>
              </div>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2.5 sm:mt-12">
              {platforms.map((platform) => {
                const w = platform.logoWidthPx
                const h = platform.logoHeightPx
                return (
                  <div
                    key={platform.name}
                    className={cn(
                      'marketing-float group relative flex min-h-11 shrink-0 items-center gap-3 overflow-visible rounded-full border border-primary/25 bg-card/60 py-1.5 pl-2 pr-3.5 backdrop-blur-sm sm:gap-3.5 sm:pl-2.5 sm:pr-4',
                      platform.name === 'OnlyFans' && 'marketing-hero-platform-pill-of',
                      platform.name === 'Fansly' && 'marketing-hero-platform-pill-fl',
                    )}
                    style={{ animationDelay: platform.delay }}
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <Image
                      src={platform.logoSrc}
                      alt={t('home.hero.platformLogoAlt', { name: platform.name })}
                      width={w}
                      height={h}
                      className="relative z-10 h-[3.25rem] w-auto shrink-0 object-contain object-left sm:h-14"
                      sizes="(max-width: 640px) 160px, 200px"
                    />
                    <span className="relative text-xs font-medium text-foreground/90 sm:text-sm">
                      {t('home.hero.platformCompatibleBefore')} <span className="text-primary">{platform.name}</span>
                    </span>
                  </div>
                )
              })}
            </div>
            <HomeHeroUpcoming
              eyebrow={t('home.hero.upcoming.eyebrow')}
              items={
                [
                  t('home.hero.upcoming.item0'),
                  t('home.hero.upcoming.item1'),
                  t('home.hero.upcoming.item2'),
                ] as const
              }
              pricingCycleCaption={t('home.hero.upcoming.pricingCycleCaption')}
              caption={t('home.hero.upcoming.caption')}
              linkLabel={t('home.hero.upcoming.link')}
              expandAriaLabel={t('home.hero.upcoming.expandAria')}
              collapseAriaLabel={t('home.hero.upcoming.collapseAria')}
            />
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-8 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{t('home.speakSection.heading')}</h2>
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
              {t('home.goddesses.circeTitle')}{' '}
              <span className="text-muted-foreground">{t('home.goddesses.headingAnd')}</span>{' '}
              <span className="text-primary">{t('home.goddesses.venusTitle')}</span>
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
                    {t('home.goddesses.circeTitle')}
                  </h3>
                  <p className="mb-1 text-sm font-semibold leading-snug text-circe-light/95 sm:text-base">
                    {t('home.goddesses.circeTagline')}
                  </p>
                  <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-circe/75">
                    {t('home.goddesses.circeEyebrow')}
                  </p>
                  <ul className="space-y-3.5 text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]">
                    {circeBullets.map((line) => (
                      <li key={line} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-circe-light shadow-[0_0_10px_oklch(0.72_0.12_295/0.7)]" />
                        <span>{line}</span>
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
                    {t('home.goddesses.venusTitle')}
                  </h3>
                  <p className="mb-1 text-sm font-semibold leading-snug text-foreground/95 sm:text-base">
                    {t('home.goddesses.venusTagline')}
                  </p>
                  <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/90">
                    {t('home.goddesses.venusEyebrow')}
                  </p>
                  <ul className="space-y-3.5 text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]">
                    {venusBullets.map((line) => (
                      <li key={line} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_oklch(0.78_0.14_85/0.65)]" />
                        <span>{line}</span>
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
            <ProModeToggle className="mb-4" proLabel={t('home.proMode.complete')} proAccent="logo" />
          </div>
        </section>
        <HomePricingSwitch />
      </MarketingModeProvider>
    </main>
  )
}
