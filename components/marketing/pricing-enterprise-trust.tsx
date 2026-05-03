import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'

/** BOFU enterprise + trust reinforcement below pricing calculator — server-rendered for SEO crawl. */
export async function PricingEnterpriseTrust({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'marketing' })

  return (
    <section
      aria-labelledby="pricing-enterprise-heading"
      className="mx-auto mt-14 max-w-4xl border-t border-border/50 px-4 pb-14 pt-10 sm:px-6 sm:pb-16"
    >
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <h2 id="pricing-enterprise-heading" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            {t('pricing.enterprise.heading')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {t('pricing.enterprise.body')}
          </p>
          <p className="mt-6">
            <Link
              href="/contact"
              data-marketing-conversion="pricing_enterprise_contact"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              {t('pricing.enterprise.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
        </div>
        <div>
          <h2 id="pricing-trust-heading" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            {t('pricing.enterprise.trustHeading')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{t('pricing.enterprise.trustBody')}</p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
            <li>
              <Link href="/privacy" className="font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline">
                {t('pricing.enterprise.linkPrivacy')}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline">
                {t('pricing.enterprise.linkTerms')}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline">
                {t('pricing.enterprise.linkCookies')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
