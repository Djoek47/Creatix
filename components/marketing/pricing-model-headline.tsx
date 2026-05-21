'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type Props = {
  /** Smaller type on inner marketing pages; landing uses default */
  compact?: boolean
  /** Use `h1` on /pricing; default `h2` on home and section blocks */
  as?: 'h1' | 'h2'
  className?: string
}

export function PricingModelHeadline({ compact, as: Tag = 'h2', className }: Props) {
  const t = useTranslations('marketing')
  const size =
    Tag === 'h1'
      ? 'text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl'
      : compact
        ? 'text-2xl sm:text-3xl'
        : 'text-3xl sm:text-4xl'

  return (
    <Tag
      className={cn(
        'bg-gradient-to-r from-foreground via-primary to-circe-light bg-clip-text font-serif font-semibold tracking-tight text-transparent',
        size,
        className,
      )}
    >
      {t('pricing.model.headline')}
    </Tag>
  )
}
