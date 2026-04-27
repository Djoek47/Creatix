'use client'

import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BILLING_SETTINGS_TAB_HREF } from '@/lib/billing/billing-links'
import { cn } from '@/lib/utils'

type Props = {
  /** Minimum credits this action will try to debit (shown to set expectations). */
  requiredCredits: number
  /** Short phrase, e.g. "a protection scan", "this tool run", "a web reputation scan". */
  actionContext?: string
  className?: string
}

/**
 * Consistent, product-grade notice when the wallet can’t cover a gated AI action.
 * Use when you know balance is too low *or* after a 402 from an API.
 */
export function InsufficientCreditsCallout({
  requiredCredits,
  actionContext = 'this action',
  className,
}: Props) {
  const n = Math.max(1, Math.floor(requiredCredits))
  const costLabel = `${n} credit${n === 1 ? '' : 's'}`

  return (
    <Alert
      role="status"
      className={cn(
        'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] via-background/80 to-background text-foreground shadow-sm',
        '[&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
        // Compact: match dashboard route hero h1 (font-serif) at a smaller scale
        'px-3 py-2.5 text-xs has-[>svg]:gap-x-2.5 [&>svg]:size-3.5 [&>svg]:translate-y-px',
        className,
      )}
    >
      <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <AlertTitle className="font-serif text-sm font-semibold tracking-tight text-foreground">
        Insufficient AI credits
      </AlertTitle>
      <AlertDescription className="font-serif text-xs text-muted-foreground [&_p]:leading-snug">
        <p>
          <span className="font-medium text-foreground">{costLabel}</span> is required for {actionContext}. Your current
          balance is too low to start.
        </p>
        <p className="mt-1.5">
          <Link
            href={BILLING_SETTINGS_TAB_HREF}
            className="font-medium text-venus underline decoration-venus/40 underline-offset-2 transition-colors hover:text-venus/90"
          >
            Open Billing to add credits
          </Link>
          <span className="text-muted-foreground"> — or wait for your monthly included pool to refresh.</span>
        </p>
      </AlertDescription>
    </Alert>
  )
}
