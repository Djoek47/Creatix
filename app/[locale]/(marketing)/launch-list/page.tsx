import type { Metadata } from 'next'
import type { Phase1Locale } from '@/lib/i18n/routing'
import { buildMarketingLocaleMetadata } from '@/lib/seo/marketing-metadata'
import { MotionReveal } from '@/components/marketing/motion-reveal'
import { MobileLaunchListForm } from '@/components/marketing/mobile-launch-list-form'
import { cn } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

type PageProps = { params: Promise<{ locale: string }> }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })
  const keywords = asStringArray(t.raw('launchList.meta.keywords'))

  return buildMarketingLocaleMetadata({
    locale: locale as Phase1Locale,
    path: '/launch-list',
    title: t('launchList.meta.title'),
    description: t('launchList.meta.description'),
    keywords,
  })
}

export default async function LaunchListPage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketing' })

  return (
    <main className="relative z-10 pt-14 sm:pt-16">
      <section className="relative overflow-hidden px-4 pb-24 pt-12 sm:px-6 sm:pb-28 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-[32rem]">
          <MotionReveal className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/75 dark:text-amber-200/65">
              {t('launchList.eyebrow')}
            </p>
            <h1 className="mt-4 font-serif text-[2.125rem] font-semibold leading-[1.06] tracking-[-0.035em] text-foreground sm:text-[2.625rem] md:text-[2.875rem]">
              {t('launchList.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-[36ch] text-pretty text-[15px] leading-[1.55] tracking-[-0.012em] text-muted-foreground sm:text-[15.5px]">
              {t('launchList.subhead')}
            </p>
          </MotionReveal>
          <MotionReveal
            delay={0.08}
            className={cn(
              'mt-10 sm:mt-12',
              'rounded-[1.125rem] border border-white/[0.08] bg-card/[0.35] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl',
              'dark:border-white/[0.09] dark:bg-slate-950/40',
            )}
          >
            <MobileLaunchListForm />
          </MotionReveal>
        </div>
      </section>
    </main>
  )
}
