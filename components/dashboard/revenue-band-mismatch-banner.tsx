'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { catchUpPaidSubscriptionToObservedTier } from '@/app/actions/stripe'
import { toast } from '@/hooks/use-toast'

/** Non-blocking banner when paid tier is below the minimum implied by linked OF/Fansly scoped revenue. */
export function RevenueBandMismatchBanner() {
  const [violating, setViolating] = useState<boolean | null>(null)
  const [requiredTier, setRequiredTier] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/billing/revenue-band-status', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const j = (await res.json()) as {
          bandViolation?: boolean
          requiredMinTier?: number | null
        }
        if (cancelled) return
        setViolating(Boolean(j.bandViolation))
        setRequiredTier(typeof j.requiredMinTier === 'number' ? j.requiredMinTier : null)
      } catch {
        if (!cancelled) setViolating(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (violating !== true) return null

  return (
    <div className="relative z-[50] shrink-0 border-b border-amber-500/35 bg-amber-500/[0.09] px-4 py-2 dark:bg-amber-950/25">
      <Alert className="pointer-events-auto mx-auto w-full max-w-4xl border-amber-500/35 bg-transparent p-2 shadow-none dark:bg-transparent md:p-3">
        <AlertTriangle className="text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-foreground">Upgrade your revenue band</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0">
            Your subscription band is below what your linked OnlyFans or Fansly activity suggests
            {requiredTier != null ? ` (tier ${requiredTier} or higher)` : ''}. The overnight alignment job applies on
            renewal without mid-cycle proration unless you catch up below. Disconnecting a linked platform clears its
            observation until you reconnect.
            {' '}
            <Link href="/dashboard/settings?tab=billing" className="font-medium text-foreground underline-offset-4 hover:underline">
              Billing settings
            </Link>
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            className="shrink-0 border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25"
            onClick={() => {
              startTransition(async () => {
                const r = await catchUpPaidSubscriptionToObservedTier()
                if (!r.ok) {
                  toast({
                    variant: 'destructive',
                    title: 'Could not update Stripe',
                    description: r.error,
                  })
                  return
                }
                if (r.mode === 'already_aligned') {
                  toast({ title: 'Already aligned', description: 'Your tier matches linked activity.' })
                  setViolating(false)
                  return
                }
                toast({
                  title: 'Proration initiated',
                  description:
                    'Stripe will invoice the tier difference for this period. Your subscription metadata updates after webhooks complete.',
                })
                try {
                  const chk = await fetch('/api/billing/revenue-band-status', { credentials: 'include' })
                  if (chk.ok) {
                    const j = (await chk.json()) as { bandViolation?: boolean; requiredMinTier?: number | null }
                    setViolating(Boolean(j.bandViolation))
                    setRequiredTier(typeof j.requiredMinTier === 'number' ? j.requiredMinTier : null)
                  }
                } catch {
                  //
                }
              })
            }}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              'Charge proration now'
            )}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
