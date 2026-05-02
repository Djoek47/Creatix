import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { Button } from '@/components/ui/button'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'

type PageProps = { params: Promise<{ locale: string }> }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const keywords = asStringArray(t.raw('mobileApp.meta.keywords'))

  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/mobile-app',
    title: t('mobileApp.meta.title'),
    description: t('mobileApp.meta.description'),
    keywords,
  })
}

export default async function MobileAppPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const pillars = [0, 1, 2].map((i) => t(`mobileApp.pillars.${i}`))

  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-14 pt-14 sm:px-6 sm:pb-18 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/16 via-circe/8 to-transparent" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Smartphone className="h-3.5 w-3.5" aria-hidden />
              {t('mobileApp.badge')}
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              {t('mobileApp.heroLead')}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                {' '}
                {t('mobileApp.heroAccent')}
              </span>
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              {t('mobileApp.heroSub')}
            </p>
          </MotionReveal>
          <MotionReveal delay={0.14}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/launch-list">
                <Button
                  size="lg"
                  className="min-h-12 gap-2 rounded-full bg-gradient-to-r from-primary to-circe/90 px-6 sm:px-8 py-3 text-center text-sm leading-snug text-primary-foreground shadow-xl shadow-primary/20 hover:opacity-[0.97] whitespace-normal sm:text-base max-w-[min(100%,24rem)]"
                >
                  {t('mobileApp.ctaLaunchList')}{' '}
                  <ArrowRight className="inline h-4 w-4 shrink-0 align-middle" aria-hidden />
                </Button>
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-18">
        <div className="mx-auto max-w-6xl">
          <MotionReveal>
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.14] via-circe/[0.1] to-fuchsia-400/[0.08] p-8 text-center shadow-xl shadow-primary/10 sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">
                  {t('mobileApp.bannerEyebrow')}
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                  {t('mobileApp.bannerTitleBefore')}
                  <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                    {' '}
                    {t('mobileApp.bannerTitleAccent')}
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
                  {t('mobileApp.bannerBody')}
                </p>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-card/70 to-primary/[0.06] p-6 sm:p-8">
          <MotionReveal>
            <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{t('mobileApp.pillarsSectionTitle')}</h2>
            <ul className="mt-5 space-y-2.5">
              {pillars.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-foreground/90 sm:text-base">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </MotionReveal>
        </div>
      </section>
    </main>
  )
}
