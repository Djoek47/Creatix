'use client'

import { cn } from '@/lib/utils'

interface BrandTitleProps {
  className?: string
  /** Sidebar vs header/landing (same colors; variant for any future tweaks) */
  variant?: 'sidebar' | 'header'
}

/** Circe (purple), " and " (purple→gold gradient), Venus (gold). Normal Cinzel. Every brand title. */
export function BrandTitle({ className, variant = 'header' }: BrandTitleProps) {
  return (
    <span className={cn('font-brand font-normal tracking-tight', className)}>
      <span className="text-accent">Circe</span>
      <span className="brand-and-gradient"> and </span>
      <span className="text-primary">Venus</span>
    </span>
  )
}
