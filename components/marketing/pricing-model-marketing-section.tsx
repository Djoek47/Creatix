import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PRICING_MODEL_TRIAL_LINE } from '@/lib/marketing/pricing-copy'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { Layers, Percent, Sparkles } from 'lucide-react'

type Layout = 'default' | 'bento'

/** Same payment story as the home page — keeps marketing aligned with /pricing. */
export function PricingModelMarketingSection({ layout = 'default' }: { layout?: Layout }) {
  if (layout === 'bento') {
    return (
      <section className="border-y border-border/30 bg-gradient-to-b from-card/40 via-background to-card/30 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <PricingModelHeadline compact className="mx-auto max-w-3xl" />
            <div className="mx-auto mt-4 max-w-2xl">
              <PricingModelInlineBlurb />
              <p className="mt-4 text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-primary/20 bg-card/80 p-6 text-left shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Focus (1–2)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Subscribe for one or two adult platforms. In billing, pick the platforms you need; choosing all
                three switches you to Unified checkout.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-card p-6 text-left shadow-sm sm:col-span-1 lg:col-span-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Percent className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Fair platform pricing</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                OnlyFans is the reference price each tier. Fansly and ManyVids are derived so discounts stay
                consistent across all eleven bands.
              </p>
            </div>
            <div className="rounded-2xl border border-circe/25 bg-gradient-to-br from-circe/5 to-card p-6 text-left shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-circe/15 text-circe-light">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Unified bundle</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                The full three-platform workspace uses the classic Unified monthly price for your revenue band
                — unchanged for creators who run everything in one place.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/#pricing">
              <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto">
                Interactive pricing (home)
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Full table &amp; FAQ
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
