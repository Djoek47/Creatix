'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'
import { protectionProduct } from '@/lib/seo/pricing-seo'
import { fmtUsd } from '@/lib/marketing/fmt-usd'

/** How single-platform vs Bundled works — short; details live on /pricing. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  const t = useTranslations('marketing')
  const protectionPrice = fmtUsd(protectionProduct.priceMonthly ?? 25)
  const bundleAddon = fmtUsd(BUNDLE_ADDONS.FL_ON_OF)

  return (
    <p className={cn('text-muted-foreground', className)}>
      {t.rich('pricing.inline.blurb', {
        protectionPrice,
        bundleAddon,
        sp: (chunks) => <strong className="text-foreground">{chunks}</strong>,
        bu: (chunks) => <strong className="text-foreground">{chunks}</strong>,
        pr: (chunks) => <strong className="text-foreground">{chunks}</strong>,
        calc: (chunks) => <strong className="text-foreground">{chunks}</strong>,
      })}
    </p>
  )
}
