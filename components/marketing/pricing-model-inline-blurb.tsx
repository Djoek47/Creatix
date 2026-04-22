import { cn } from '@/lib/utils'
import { BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'

/** How Focus vs Unified works — short; details live on /pricing. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      <strong className="text-foreground">Focus</strong> covers the adult platforms you select (one or two).{' '}
      <strong className="text-foreground">Unified</strong> is OnlyFans, Fansly, and ManyVids in one bill (
      <strong className="text-foreground">{`OnlyFans base + $${BUNDLE_ADDONS.UNIFIED_ON_OF}`}/mo</strong> for your
      revenue band). Your price scales with a simple monthly revenue band — use the calculator on{' '}
      <strong className="text-foreground">Pricing</strong> for exact numbers.
    </p>
  )
}
