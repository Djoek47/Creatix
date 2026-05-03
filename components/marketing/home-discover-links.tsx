import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'

/** Internal crawl path boost: links to demo, pricing, features, how-it-works. */
export async function HomeDiscoverLinks({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'marketing' })

  const entries = [
    { href: '/demo' as const, conv: 'home_nav_demo' as const, label: t('home.discover.demoLabel') },
    { href: '/pricing' as const, conv: 'home_nav_pricing' as const, label: t('home.discover.pricingLabel') },
    { href: '/features' as const, conv: 'home_nav_features' as const, label: t('home.discover.featuresLabel') },
    { href: '/how-it-works' as const, conv: 'home_nav_how' as const, label: t('home.discover.howLabel') },
  ]

  return (
    <section aria-labelledby="home-discover-heading" className="px-4 pb-6 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border/55 bg-muted/25 px-5 py-8 text-center backdrop-blur-sm sm:py-10">
        <h2 id="home-discover-heading" className="font-serif text-lg font-semibold tracking-tight sm:text-xl">
          {t('home.discover.title')}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-muted-foreground sm:text-sm">{t('home.discover.sub')}</p>
        <nav aria-label={t('home.discover.navAria')} className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
          {entries.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-marketing-conversion={item.conv}
              className="inline-flex rounded-full border border-border/70 bg-background/80 px-4 py-2 text-[13px] font-medium text-foreground shadow-sm transition-[border-color,background-color,color] hover:border-primary/45 hover:bg-primary/10 sm:text-[14px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
