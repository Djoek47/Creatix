'use client'

import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'
import { cn } from '@/lib/utils'

type Props = {
  /** When true, no outer `<section id="pricing">` — parent supplies layout. */
  embedded?: boolean
}

export function LandingPricingSection({ embedded = false }: Props) {
  const inner = (
    <div className="mx-auto max-w-4xl">
      {!embedded && (
        <div className="text-center">
          <PricingModelHeadline className="mx-auto max-w-4xl" />
        </div>
      )}

      <div className={cn(!embedded && 'mt-10', embedded && 'mt-0')}>
        <PricingPageCalculator surface="landing" />
      </div>
    </div>
  )

  if (embedded) {
    return inner
  }

  return (
    <section id="pricing" className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-24">
      {inner}
    </section>
  )
}
