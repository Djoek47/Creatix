import { cn } from '@/lib/utils'

/** Single source for how Focus / Unified / revenue bands work — use on landing, features, how-it-works, etc. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      <strong className="text-foreground">Focus</strong> is full Pro tools for{' '}
      <strong className="text-foreground">one or two</strong> adult platforms. OnlyFans is the price base;
      Fansly is about <strong className="text-foreground">10% lower</strong> and ManyVids about{' '}
      <strong className="text-foreground">25% lower</strong> at each band. Two platforms on Focus use the{' '}
      <strong className="text-foreground">rounded average</strong> of those two prices.{' '}
      <strong className="text-foreground">Unified</strong> is when you need{' '}
      <strong className="text-foreground">all three</strong> — the original bundle price for your revenue band.
      Choose your monthly revenue band; pricing scales with your business.
    </p>
  )
}
