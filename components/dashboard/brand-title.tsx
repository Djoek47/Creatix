'use client'

import { cn } from '@/lib/utils'

interface BrandTitleProps {
  className?: string
  /** Sidebar: use text-sidebar-foreground for " and "; header: use default (muted) */
  variant?: 'sidebar' | 'header'
}

/** "Circe" in purple, " and " in neutral, "Venus" in gold — same in sidebar (side) and header (above). */
export function BrandTitle({ className, variant = 'header' }: BrandTitleProps) {
  const andClass = variant === 'sidebar' ? 'text-sidebar-foreground' : 'text-muted-foreground'
  return (
    <span className={cn('font-brand font-bold tracking-tight', className)}>
      <span className="text-accent">Circe</span>
      <span className={andClass}> and </span>
      <span className="text-primary">Venus</span>
    </span>
  )
}
