'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'

/**
 * Manage billing: opens Stripe Customer Portal (payment methods, invoices, subscription).
 * Subscribe: starts Stripe Checkout for subscription (if price is configured).
 */
export function BillingActions() {
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  async function openPortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open billing')
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Could not open billing portal')
    } finally {
      setLoadingPortal(false)
    }
  }

  async function startCheckout() {
    setLoadingCheckout(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Could not start checkout')
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="default"
        className="gap-2"
        onClick={openPortal}
        disabled={loadingPortal || loadingCheckout}
      >
        {loadingPortal ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        Manage billing & payment
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        onClick={startCheckout}
        disabled={loadingPortal || loadingCheckout}
      >
        {loadingCheckout ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        Subscribe / Upgrade
      </Button>
    </div>
  )
}
