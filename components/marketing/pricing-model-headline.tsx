import { cn } from '@/lib/utils'

type Props = {
  /** Smaller type on inner marketing pages; landing uses default */
  compact?: boolean
  /** Use `h1` on /pricing; default `h2` on home and section blocks */
  as?: 'h1' | 'h2'
  className?: string
}

/** Matches PRICING_MODEL_HEADLINE with brand emphasis on Focus / Unified */
export function PricingModelHeadline({ compact, as: Tag = 'h2', className }: Props) {
  const size =
    Tag === 'h1'
      ? 'text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'
      : compact
        ? 'text-2xl sm:text-3xl'
        : 'text-3xl sm:text-4xl'

  return (
    <Tag className={cn('font-serif font-semibold tracking-tight', size, className)}>
      Revenue-based <span className="text-primary">Focus</span> &amp;{' '}
      <span className="text-primary">Unified</span>
    </Tag>
  )
}
