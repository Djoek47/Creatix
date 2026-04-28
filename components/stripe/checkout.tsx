'use client'

import { useCallback, useState, type ReactNode } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  parsePaidCheckoutBlockedError,
  startCheckoutSession,
  startCustomCreditTopupCheckout,
  startPaidSubscriptionCheckout,
} from '@/app/actions/stripe'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import type { BillingVariant } from '@/lib/pricing-matrix'
import { sortFocusPlatforms, type AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { PAID_PLAN_ID } from '@/lib/billing/access'
import { DEFAULT_BILLING_SEATS } from '@/lib/billing/seats'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null
const STRIPE_CONFIG_ERROR =
  'Stripe checkout is not configured yet. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable payments.'

interface CheckoutProps {
  productId: string
  billingVariant?: BillingVariant
  tierIndex?: number
  /** Focus (`single`): 1–2 platforms; omit for Unified (`multi`). */
  focusPlatforms?: AdultBillingPlatform[] | null
  /** Managers on the same creator account (multiplies monthly price). */
  seats?: number
  buttonText?: ReactNode
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  buttonClassName?: string
  customTopupUsdAmount?: number
  onComplete?: () => void | Promise<void>
  children?: React.ReactNode
  disabled?: boolean
}

export function Checkout({
  productId,
  billingVariant,
  tierIndex,
  focusPlatforms,
  seats = DEFAULT_BILLING_SEATS,
  buttonText = 'Subscribe',
  buttonVariant = 'default',
  buttonClassName,
  customTopupUsdAmount,
  onComplete,
  children,
  disabled = false,
}: CheckoutProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const stripeReady = stripePromise !== null

  const fetchClientSecret = useCallback(async () => {
    setCheckoutError(null)
    setLoading(true)
    try {
      if (typeof customTopupUsdAmount === 'number') {
        return await startCustomCreditTopupCheckout(customTopupUsdAmount)
      }
      if (productId === PAID_PLAN_ID) {
        if (billingVariant == null || tierIndex == null) {
          throw new Error('Choose revenue band and plan type before checkout.')
        }
        return await startPaidSubscriptionCheckout({
          variant: billingVariant,
          tierIndex,
          focusPlatforms:
            billingVariant === 'single'
              ? focusPlatforms?.length
                ? focusPlatforms
                : ['onlyfans']
              : billingVariant === 'multi' &&
                  focusPlatforms?.length &&
                  sortFocusPlatforms(focusPlatforms).includes('manyvids')
                ? (['onlyfans', 'fansly', 'manyvids'] as AdultBillingPlatform[])
                : null,
          seats,
        })
      }
      return await startCheckoutSession(productId)
    } catch (e) {
      const blocked = parsePaidCheckoutBlockedError(e)
      setCheckoutError(
        blocked
          ? `Linked account activity requires at least ${blocked.bandLabel} (tier ${blocked.requiredMinTier}). Raise your tier in the estimate above, then try again—or disconnect a platform under Connections if it should not affect billing yet.`
          : e instanceof Error
            ? e.message
            : 'Checkout failed',
      )
      throw e
    } finally {
      setLoading(false)
    }
  }, [productId, billingVariant, tierIndex, focusPlatforms, seats, customTopupUsdAmount])

  const handleComplete = useCallback(() => {
    setCompleted(true)
    void onComplete?.()
  }, [onComplete])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setCheckoutError(null)
        else {
          setCompleted(false)
          setCheckoutError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button variant={buttonVariant} className={buttonClassName} disabled={disabled || !stripeReady}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{completed ? 'Payment complete' : 'Complete your purchase'}</DialogTitle>
        </DialogHeader>
        {completed ? (
          <div className="billing-card-enter relative overflow-hidden rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-purple-500/12 to-background p-6 shadow-[0_0_0_1px_rgba(245,158,11,0.28),0_24px_50px_-28px_rgba(168,85,247,0.75)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_55%)]" />
            <div className="pointer-events-none absolute -inset-[1px] rounded-xl border border-amber-300/25" />
            <div className="relative space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Confirmed
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
                <div>
                  <p className="text-base font-semibold text-foreground">Payment successful.</p>
                  <p className="text-sm text-muted-foreground">
                    We are syncing credits and billing state now. You can safely close this window.
                  </p>
                </div>
              </div>
              <Button className="mt-2 bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-[0_10px_26px_-14px_rgba(168,85,247,0.8)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:from-amber-400 hover:to-purple-500 active:translate-y-px" onClick={() => setOpen(false)}>
                Continue
              </Button>
            </div>
          </div>
        ) : !stripeReady ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {STRIPE_CONFIG_ERROR}
          </div>
        ) : (
          <div id="checkout" className="min-h-[400px] space-y-3">
            {checkoutError ? (
              <Alert variant="destructive">
                <AlertDescription>{checkoutError}</AlertDescription>
              </Alert>
            ) : null}
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret, onComplete: handleComplete }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function CheckoutEmbed({
  productId,
  billingVariant,
  tierIndex,
  focusPlatforms,
  seats = DEFAULT_BILLING_SEATS,
  onComplete,
  className,
  rootId = 'checkout',
}: {
  productId: string
  billingVariant?: BillingVariant
  tierIndex?: number
  focusPlatforms?: AdultBillingPlatform[] | null
  seats?: number
  /** Fires when Stripe Embedded Checkout completes (e.g. trial card collected). */
  onComplete?: () => void | Promise<void>
  className?: string
  /** Avoid duplicate `id="checkout"` when multiple embeds exist in the DOM. */
  rootId?: string
}) {
  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        {STRIPE_CONFIG_ERROR}
      </div>
    )
  }

  const fetchClientSecret = useCallback(() => {
    if (productId === PAID_PLAN_ID) {
      if (billingVariant == null || tierIndex == null) {
        return Promise.reject(new Error('Missing billing options'))
      }
      return startPaidSubscriptionCheckout({
        variant: billingVariant,
        tierIndex,
        focusPlatforms:
          billingVariant === 'single'
            ? focusPlatforms?.length
              ? focusPlatforms
              : ['onlyfans']
            : billingVariant === 'multi' &&
                focusPlatforms?.length &&
                sortFocusPlatforms(focusPlatforms).includes('manyvids')
              ? (['onlyfans', 'fansly', 'manyvids'] as AdultBillingPlatform[])
              : null,
        seats,
      })
    }
    return startCheckoutSession(productId)
  }, [productId, billingVariant, tierIndex, focusPlatforms, seats])

  const handleComplete = useCallback(() => {
    void onComplete?.()
  }, [onComplete])

  return (
    <div id={rootId} className={className}>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret, onComplete: handleComplete }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
