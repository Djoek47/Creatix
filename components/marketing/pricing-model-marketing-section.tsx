import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'

/** Same payment story as the home page — keeps Features / How it works aligned with /pricing until a deliberate update. */
export function PricingModelMarketingSection() {
  return (
    <section className="border-y border-border/30 bg-card/30 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <PricingModelHeadline compact />
        <div className="mx-auto mt-4 max-w-2xl">
          <PricingModelInlineBlurb />
          <p className="mt-4 text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/#pricing">
            <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto">
              Interactive pricing (home)
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Full pricing &amp; FAQ
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
