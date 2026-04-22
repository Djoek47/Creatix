import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PRICING_MODEL_TRIAL_LINE, CREDIT_ALLOWANCE_MARKETING_LINE } from '@/lib/marketing/pricing-copy'
import { PricingModelInlineBlurb } from '@/components/marketing/pricing-model-inline-blurb'
import { PricingModelHeadline } from '@/components/marketing/pricing-model-headline'
import { Layers, Cpu, Sparkles } from 'lucide-react'

type Layout = 'default' | 'bento'

/** Same payment story as the home page — keeps marketing aligned with /pricing. */
export function PricingModelMarketingSection({ layout = 'default' }: { layout?: Layout }) {
  if (layout === 'bento') {
    return (
      <section className="border-y border-border/30 bg-gradient-to-b from-card/40 via-background to-card/30 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <PricingModelHeadline compact className="mx-auto max-w-3xl" />
            <div className="mx-auto mt-4 max-w-2xl space-y-3">
              <PricingModelInlineBlurb />
              <p className="text-sm text-muted-foreground">{CREDIT_ALLOWANCE_MARKETING_LINE}</p>
              <p className="text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-primary/20 bg-card/80 p-6 text-left shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Layers className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Focus (1–2 platforms)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose the platforms you use. Picking all three moves you to Unified pricing in checkout.
              </p>
            </div>
            <div className="rounded-2xl border border-circe/25 bg-gradient-to-br from-circe/5 to-card p-6 text-left shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-circe/15 text-circe-light">
                <Cpu className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">AI credits</h3>
              <p className="mt-2 text-sm text-muted-foreground">{CREDIT_ALLOWANCE_MARKETING_LINE}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.06] to-card p-6 text-left shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Unified (all three)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                One monthly price for OnlyFans, Fansly, and ManyVids — see the calculator on Pricing for your band.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/#pricing">
              <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto">
                Pricing on home
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Full pricing
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
          <p className="text-sm text-muted-foreground">{CREDIT_ALLOWANCE_MARKETING_LINE}</p>
          <p className="text-sm text-muted-foreground">{PRICING_MODEL_TRIAL_LINE}</p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/#pricing">
            <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto">
              Pricing on home
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Full pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
