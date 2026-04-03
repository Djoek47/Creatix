'use client'

import { useCallback, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { startCheckoutSession, startPaidSubscriptionCheckout } from '@/app/actions/stripe'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import type { BillingVariant } from '@/lib/pricing-matrix'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { PAID_PLAN_ID } from '@/lib/billing/access'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutProps {
  productId: string
  billingVariant?: BillingVariant
  tierIndex?: number
  /** Focus (`single`): 1–2 platforms; omit for Unified (`multi`). */
  focusPlatforms?: AdultBillingPlatform[] | null
  buttonText?: string
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  buttonClassName?: string
  children?: React.ReactNode
  disabled?: boolean
}

export function Checkout({
  productId,
  billingVariant,
  tierIndex,
  focusPlatforms,
  buttonText = 'Subscribe',
  buttonVariant = 'default',
  buttonClassName,
  children,
  disabled = false,
}: CheckoutProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchClientSecret = useCallback(async () => {
    setLoading(true)
    try {
      if (productId === PAID_PLAN_ID) {
        if (billingVariant == null || tierIndex == null) {
          throw new Error('Choose revenue band and plan type before checkout.')
        }
        return await startPaidSubscriptionCheckout({
          variant: billingVariant,
          tierIndex,
          focusPlatforms:
            billingVariant === 'single' ? (focusPlatforms?.length ? focusPlatforms : ['onlyfans']) : null,
        })
      }
      return await startCheckoutSession(productId)
    } finally {
      setLoading(false)
    }
  }, [productId, billingVariant, tierIndex, focusPlatforms])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={buttonVariant} className={buttonClassName} disabled={disabled}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
        </DialogHeader>
        <div id="checkout" className="min-h-[400px]">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CheckoutEmbed({
  productId,
  billingVariant,
  tierIndex,
  focusPlatforms,
}: {
  productId: string
  billingVariant?: BillingVariant
  tierIndex?: number
  focusPlatforms?: AdultBillingPlatform[] | null
}) {
  const fetchClientSecret = useCallback(() => {
    if (productId === PAID_PLAN_ID) {
      if (billingVariant == null || tierIndex == null) {
        return Promise.reject(new Error('Missing billing options'))
      }
      return startPaidSubscriptionCheckout({
        variant: billingVariant,
        tierIndex,
        focusPlatforms:
          billingVariant === 'single' ? (focusPlatforms?.length ? focusPlatforms : ['onlyfans']) : null,
      })
    }
    return startCheckoutSession(productId)
  }, [productId, billingVariant, tierIndex, focusPlatforms])

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
