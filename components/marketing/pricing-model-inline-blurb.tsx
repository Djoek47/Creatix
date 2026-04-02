import { cn } from '@/lib/utils'

/** Single source for how Single / Multi / revenue bands work — use on landing, features, how-it-works, etc. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      <strong className="text-foreground">Single</strong> covers OnlyFans only.{' '}
      <strong className="text-foreground">Multi</strong> is for OnlyFans plus other adult platforms (Fansly,
      ManyVids, etc.). Choose your monthly revenue band — pricing scales with your business.
    </p>
  )
}
