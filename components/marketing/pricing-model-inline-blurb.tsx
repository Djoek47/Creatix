import { cn } from '@/lib/utils'

/** Single source for how Focus / Unified / revenue bands work — use on landing, features, how-it-works, etc. */
export function PricingModelInlineBlurb({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground', className)}>
      <strong className="text-foreground">Focus</strong> is full Pro tools for{' '}
      <strong className="text-foreground">one</strong> adult platform (OnlyFans, Fansly, or ManyVids) — price
      depends on which you pick. <strong className="text-foreground">Unified</strong> covers{' '}
      <strong className="text-foreground">all three</strong> in one workspace. Choose your monthly revenue
      band; pricing scales with your business.
    </p>
  )
}
