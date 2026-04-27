import { cn } from '@/lib/utils'
import { BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'

/** How Focus vs Bundled works — short; details live on /pricing. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      <strong className="text-foreground">Focus</strong> is one platform or a two-platform pair (e.g. OnlyFans + ManyVids) with band-specific list
      prices. <strong className="text-foreground">Bundled</strong> is OnlyFans + Fansly in one bill for that band.{' '}
      <strong className="text-foreground">Protection &amp; Anti-Piracy</strong> is a separate $25/mo add-on for Clips4Sale, ManyVids, Loyalfans,
      Fanvue, MYM, and other non-API coverage (stackable with a main plan). List bundles like OnlyFans + Fansly use fixed band prices, not a simple +$
      {BUNDLE_ADDONS.FL_ON_OF} on the OnlyFans line — use the <strong className="text-foreground">Pricing</strong> calculator for exact numbers.
    </p>
  )
}
