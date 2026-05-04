import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { FeaturesExploreStrip } from '@/components/marketing/features-explore-strip'
import {
  Shield,
  Users,
  MessageSquare,
  Mic,
  BarChart3,
  Sparkles,
  Eye,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { getTranslations } from 'next-intl/server'

type PageProps = { params: Promise<{ locale: string }> }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

const FEATURE_ICONS = [MessageSquare, Mic, Users, Shield, Eye, BarChart3, Sparkles, Calendar] as const
const SHIPPED_INDICES = [0, 1, 2, 3, 4, 5] as const
const BETA_INDICES = [0, 1, 2, 3] as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const keywords = asStringArray(t.raw('features.meta.keywords'))

  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/features',
    title: t('features.meta.title'),
    description: t('features.meta.description'),
    keywords,
  })
}

export default async function FeaturesPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })

  return (
    <main className="marketing-main-offset relative z-10">
      <section className="relative overflow-hidden px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <MotionReveal>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              {t('features.hero.lead')}{' '}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                {t('features.hero.accent')}
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t('features.hero.subhead')}
            </p>
          </MotionReveal>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <MotionStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
            {FEATURE_ICONS.map((Icon, index) => {
              const title = t(`features.cards.${index}.title`)
              const desc = t(`features.cards.${index}.desc`)
              const accents = [
                'from-sky-500/30 via-cyan-400/15 to-transparent',
                'from-violet-500/30 via-fuchsia-400/15 to-transparent',
                'from-blue-500/25 via-indigo-400/15 to-transparent',
                'from-amber-400/30 via-orange-300/15 to-transparent',
                'from-fuchsia-500/25 via-pink-400/15 to-transparent',
                'from-emerald-500/25 via-teal-400/15 to-transparent',
                'from-violet-500/25 via-amber-300/15 to-transparent',
                'from-yellow-400/25 via-amber-300/15 to-transparent',
              ] as const
              const accent = accents[index] ?? accents[0]
              return (
                <MotionStaggerItem key={title}>
                  <article
                    className={cn(
                      'group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm',
                      'transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_45px_-28px_rgba(0,0,0,0.7)]',
                    )}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                        accent,
                      )}
                      aria-hidden
                    />
                    <div className="relative mb-4 inline-flex rounded-xl bg-amber-400/15 p-3 text-amber-300 ring-1 ring-amber-300/25 shadow-[0_0_16px_-8px_rgba(251,191,36,0.7)]">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    <h2 className="relative font-serif text-lg font-semibold">{title}</h2>
                    <p className="relative mt-2 text-sm text-muted-foreground">{desc}</p>
                  </article>
                </MotionStaggerItem>
              )
            })}
          </MotionStagger>

          <MotionReveal delay={0.08}>
            <details className="group mt-16 border-t border-border/40 pt-12 sm:mt-20 sm:pt-14">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 marker:content-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 space-y-1 text-left">
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                    {t('features.capabilities.heading')}
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                    {t('features.capabilities.intro')}
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/50 text-muted-foreground transition duration-300 ease-out group-open:rotate-180"
                  aria-hidden
                >
                  <ChevronDown className="h-5 w-5" strokeWidth={1.5} />
                </span>
              </summary>

              <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border/30">
                <div className="lg:pr-12">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {t('features.capabilities.productColumn')}
                  </p>
                  <ul className="mt-6 space-y-0">
                    {SHIPPED_INDICES.map((i) => {
                      const line = t(`features.capabilities.shipped.${i}`)
                      return (
                        <li
                          key={line}
                          className="border-t border-border/25 py-4 text-[15px] leading-relaxed text-foreground/85 first:border-t-0 first:pt-0"
                        >
                          {line}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="lg:pl-12">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {t('features.capabilities.betaColumn')}
                  </p>
                  <ul className="mt-6 space-y-0">
                    {BETA_INDICES.map((i) => {
                      const title = t(`features.capabilities.beta.${i}.title`)
                      const description = t(`features.capabilities.beta.${i}.desc`)
                      return (
                        <li key={title} className="border-t border-border/25 py-5 first:border-t-0 first:pt-0">
                          <p className="text-[15px] font-medium leading-snug text-foreground">{title}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-8 text-xs leading-relaxed text-muted-foreground/90">
                    {t('features.capabilities.betaDisclaimer')}
                  </p>
                </div>
              </div>
            </details>
          </MotionReveal>
        </div>
      </section>

      <FeaturesExploreStrip locale={locale} />
    </main>
  )
}
