import { cn } from '@/lib/utils'
import { BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'

/** Single source for how Focus / Unified / revenue bands work — use on landing, features, how-it-works, etc. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      <strong className="text-foreground">Focus</strong> is full Pro tools for{' '}
      <strong className="text-foreground">one or two</strong> adult platforms. OnlyFans is the price base; Fansly is
      about <strong className="text-foreground">10% lower</strong> (capped at {`$${BUNDLE_ADDONS.FL_CAP}`}/mo); ManyVids
      solo Focus is <strong className="text-foreground">{`flat $${BUNDLE_ADDONS.MV_FLAT}/mo`}</strong> at every band.
      Two-platform Focus uses fixed bundle add-ons:{' '}
      <strong className="text-foreground">{`OF+FL +$${BUNDLE_ADDONS.FL_ON_OF}`}</strong>,{' '}
      <strong className="text-foreground">{`OF+MV +$${BUNDLE_ADDONS.MV_ON_OF}`}</strong>,{' '}
      <strong className="text-foreground">{`FL+MV +$${BUNDLE_ADDONS.MV_ON_FL}`}</strong> on top of the primary line.{' '}
      <strong className="text-foreground">Unified</strong> is <strong className="text-foreground">all three</strong> at{' '}
      <strong className="text-foreground">{`OnlyFans base + $${BUNDLE_ADDONS.UNIFIED_ON_OF}`}</strong> for your revenue
      band. Choose your monthly revenue band; pricing scales with your business.
    </p>
  )
}
