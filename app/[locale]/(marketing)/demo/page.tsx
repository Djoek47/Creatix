import { MotionReveal, MotionStagger, MotionStaggerItem } from '@/components/marketing/motion-reveal'
import { DemoTrialSignupButton } from '@/components/marketing/demo-trial-signup-button'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import {
  BarChart3,
  Bot,
  Link2,
  MessageSquare,
  Mic,
  Shield,
  Sparkles,
  TrendingUp,
  Video,
  Workflow,
} from 'lucide-react'

type PageProps = { params: Promise<{ locale: string }> }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

const STEP_ICONS = [Sparkles, Link2, Mic, TrendingUp] as const
const CAPABILITY_ICONS = [Bot, MessageSquare, Shield, Workflow, BarChart3, Mic] as const
const FLOW_INDICES = [0, 1, 2] as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const keywords = asStringArray(t.raw('demo.meta.keywords'))

  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/demo',
    title: t('demo.meta.title'),
    description: t('demo.meta.description'),
    keywords,
  })
}

export default async function DemoPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })

  return (
    <main className="marketing-main-offset relative z-10">
      <section className="relative px-4 pb-14 pt-14 sm:px-6 sm:pb-18 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <MotionReveal>
            <p className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t('demo.badge')}
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              {t('demo.headline.lead')}
              <span className="bg-gradient-to-r from-circe-light via-primary to-fuchsia-300 bg-clip-text text-transparent">
                {' '}
                {t('demo.headline.accent')}
              </span>
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              {t('demo.subhead')}
            </p>
          </MotionReveal>

          <MotionReveal delay={0.14}>
            <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col gap-8 sm:mt-12">
              <div className="flex min-w-0 flex-col items-stretch gap-2.5 text-center">
                <div
                  role="status"
                  className="inline-flex h-14 w-full min-h-[3.75rem] shrink-0 cursor-default select-none items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-circe/90 px-6 text-base font-semibold tracking-[-0.02em] text-primary-foreground opacity-[0.92] shadow-[0_18px_44px_-14px] shadow-primary/35 ring-1 ring-foreground/10 sm:h-16 sm:min-h-[4rem] sm:px-8 sm:text-lg"
                >
                  <Video className="h-5 w-5 shrink-0 opacity-90 sm:h-6 sm:w-6" aria-hidden />
                  <span className="min-w-0 text-pretty">{t('demo.ctaVideoWalkthrough')}</span>
                </div>
                <p className="min-h-[3.25rem] text-pretty text-center text-[13px] leading-snug text-muted-foreground sm:min-h-[3.5rem] sm:text-sm">
                  {t('demo.ctaVideoWalkthroughHint')}
                </p>
              </div>
              <div className="mx-auto flex min-w-0 w-[min(100%,21.5rem)] flex-col items-stretch gap-2 text-center sm:w-[min(100%,24rem)]">
                <DemoTrialSignupButton label={t('demo.ctaTrial')} />
                <p className="min-h-[2.25rem] text-pretty text-center text-[11px] leading-snug text-muted-foreground sm:min-h-[2.5rem] sm:text-xs">
                  {t('demo.ctaTrialHint')}
                </p>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      <section id="how-it-works" className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <MotionReveal className="mb-8 text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{t('demo.howItWorks')}</h2>
          </MotionReveal>
          <MotionStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {STEP_ICONS.map((Icon, index) => {
              const stepKey = `demo.steps.${index}` as const
              return (
                <MotionStaggerItem key={t(`${stepKey}.number`)}>
                  <div className="h-full rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-2xl font-bold text-primary/40">{t(`${stepKey}.number`)}</span>
                      <div className="inline-flex rounded-xl bg-primary/15 p-3 text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                    </div>
                    <h3 className="mt-5 font-serif text-xl font-semibold">{t(`${stepKey}.title`)}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{t(`${stepKey}.desc`)}</p>
                  </div>
                </MotionStaggerItem>
              )
            })}
          </MotionStagger>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20" aria-labelledby="demo-capabilities-heading">
        <div className="mx-auto max-w-6xl border-t border-border/30 pt-14 sm:pt-20">
          <MotionReveal>
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {t('demo.surfaceEyebrow')}
            </p>
            <h2
              id="demo-capabilities-heading"
              className="mx-auto mt-3 max-w-2xl text-center font-serif text-3xl font-medium tracking-tight text-foreground sm:text-[2rem] sm:leading-tight"
            >
              {t('demo.surfaceTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-muted-foreground">
              {t('demo.surfaceSub')}
            </p>
          </MotionReveal>
          <MotionStagger className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14" stagger={0.05}>
            {CAPABILITY_ICONS.map((Icon, index) => {
              const capKey = `demo.capabilities.${index}` as const
              const title = t(`${capKey}.title`)
              return (
                <MotionStaggerItem key={title}>
                  <article className="flex gap-4">
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0 text-foreground/40"
                      strokeWidth={1.25}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-medium leading-snug tracking-tight text-foreground">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${capKey}.desc`)}</p>
                    </div>
                  </article>
                </MotionStaggerItem>
              )
            })}
          </MotionStagger>
        </div>
      </section>

      <section id="demo-flows" className="px-4 pb-20 sm:px-6 sm:pb-24" aria-labelledby="demo-flows-heading">
        <div className="mx-auto max-w-6xl border-t border-border/30 pt-14 sm:pt-20">
          <MotionReveal>
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {t('demo.narrativesEyebrow')}
            </p>
            <h2
              id="demo-flows-heading"
              className="mx-auto mt-3 max-w-3xl text-center font-serif text-3xl font-medium tracking-tight text-foreground sm:text-[2.125rem] sm:leading-tight"
            >
              {t('demo.narrativesTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-muted-foreground">
              {t('demo.narrativesSub')}
            </p>
          </MotionReveal>
          <MotionStagger className="mt-16 grid gap-12 lg:mt-20 lg:grid-cols-3 lg:gap-0" stagger={0.06}>
            {FLOW_INDICES.map((index) => {
              const flowKey = `demo.flows.${index}` as const
              const title = t(`${flowKey}.title`)
              const bullets = asStringArray(t.raw(`${flowKey}.bullets`))
              return (
                <MotionStaggerItem key={title}>
                  <article
                    className={
                      index > 0 ? 'lg:border-l lg:border-border/25 lg:pl-10' : ''
                    }
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      {t(`${flowKey}.label`)}
                    </p>
                    <h3 className="mt-5 font-serif text-2xl font-medium leading-[1.2] tracking-tight text-foreground sm:text-[1.65rem]">
                      {title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {t(`${flowKey}.detail`)}
                    </p>
                    <ul className="mt-8 space-y-3 border-t border-border/20 pt-8">
                      {bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="border-l-2 border-foreground/10 pl-4 text-sm leading-relaxed text-foreground/85"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </article>
                </MotionStaggerItem>
              )
            })}
          </MotionStagger>
        </div>
      </section>
    </main>
  )
}
