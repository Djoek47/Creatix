'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { Layers, Cpu, Sparkles } from 'lucide-react'
import { protectionProduct } from '@/lib/seo/pricing-seo'
import { fmtUsd } from '@/lib/marketing/fmt-usd'

type Layout = 'default' | 'bento'

/** Same payment story as the home page — keeps marketing aligned with /pricing. */
export function PricingModelMarketingSection({ layout = 'default' }: { layout?: Layout }) {
  const t = useTranslations('marketing')
  const protectionPrice = fmtUsd(protectionProduct.priceMonthly ?? 25)

  if (layout === 'bento') {
    return (
      <section className="border-y border-border/30 bg-gradient-to-b from-card/40 via-background to-card/30 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <PricingModelHeadline compact className="mx-auto max-w-3xl" />
            <div className="mx-auto mt-4 max-w-2xl space-y-3">
              <PricingModelInlineBlurb />
              <p className="text-sm text-muted-foreground">{t('pricing.model.creditAllowance')}</p>
              <p className="text-sm text-muted-foreground">{t('pricing.model.trialLine')}</p>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-primary/20 bg-card/80 p-6 text-left shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Layers className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                {t('pricing.marketingSection.singleCardTitle')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('pricing.marketingSection.singleCardBody')}</p>
            </div>
            <div className="rounded-2xl border border-circe/25 bg-gradient-to-br from-circe/5 to-card p-6 text-left shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-circe/15 text-circe-light">
                <Cpu className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                {t('pricing.marketingSection.aiCardTitle')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('pricing.model.creditAllowance')}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.06] to-card p-6 text-left shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">
                {t('pricing.marketingSection.bundledCardTitle')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('pricing.marketingSection.bundledCardBody', { protectionPrice })}
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/#pricing">
              <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto">
                {t('pricing.marketingSection.ctaHomePricing')}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t('pricing.marketingSection.ctaFullPricing')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-y border-border/30 bg-card/30 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <PricingModelHeadline compact />
        <div className="mx-auto mt-4 max-w-2xl space-y-3">
          <PricingModelInlineBlurb />
          <p className="text-sm text-muted-foreground">{t('pricing.model.creditAllowance')}</p>
          <p className="text-sm text-muted-foreground">{t('pricing.model.trialLine')}</p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/#pricing">
            <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto">
              {t('pricing.marketingSection.ctaHomePricing')}
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              {t('pricing.marketingSection.ctaFullPricing')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
