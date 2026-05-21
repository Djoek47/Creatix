import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'

export async function FeaturesExploreStrip({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'marketing' })

  const entries = (
    [
      { href: '/pricing' as const, conv: 'features_footer_pricing' },
      { href: '/demo' as const, conv: 'features_footer_demo' },
      { href: '/how-it-works' as const, conv: 'features_footer_how' },
      { href: '/' as const, conv: 'features_footer_home' },
    ] as const
  ).map((e) => ({
    ...e,
    label:
      e.href === '/pricing'
        ? t('features.explore.pricing')
        : e.href === '/demo'
          ? t('features.explore.demo')
          : e.href === '/how-it-works'
            ? t('features.explore.howItWorks')
            : t('features.explore.home'),
  }))

  return (
    <section aria-labelledby="features-explore-heading" className="border-t border-border/40 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="features-explore-heading" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
          {t('features.explore.title')}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-[13px] text-muted-foreground sm:text-[15px]">{t('features.explore.sub')}</p>
        <nav className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8 sm:gap-3" aria-label={t('features.explore.navAria')}>
          {entries.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-marketing-conversion={item.conv}
              className="inline-flex rounded-xl border border-border/70 bg-muted/25 px-4 py-2.5 text-[13px] font-medium transition-[border-color,background-color,color] hover:border-primary/40 hover:bg-primary/10 sm:text-[14px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
