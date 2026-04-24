'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LandingPricingSection } from '@/components/marketing/landing-pricing-section'
import { PRICING_TIERS } from '@/lib/circe-venus-pricing'
import { ArrowRight } from 'lucide-react'
import { useMarketingMode } from '@/components/marketing/marketing-mode-context'

export function HomePricingSwitch() {
  const { mode } = useMarketingMode()
  if (mode === 'pro') return <LandingPricingSection embedded />
  const fromPrice = PRICING_TIERS[0]?.prices.of ?? 39

  return (
    <section id="pricing" className="border-y border-border/30 bg-card/30 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">From ${fromPrice}/mo</h2>
        <p className="mt-3 text-muted-foreground">Price follows your monthly revenue band.</p>
        <div className="mt-8 flex justify-center">
          <Link href="/pricing">
            <Button size="lg" className="h-12 gap-2 rounded-full px-10">
              See pricing <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
