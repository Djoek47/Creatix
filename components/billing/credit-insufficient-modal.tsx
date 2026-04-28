'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Checkout } from '@/components/stripe/checkout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditAutoTopupSettings } from '@/components/billing/credit-auto-topup-settings'
import { USAGE_CREDITS_TAB_HREF } from '@/lib/billing/billing-links'
import {
  CUSTOM_CREDIT_TOPUP_DEFAULT_USD,
  CUSTOM_CREDIT_TOPUP_MIN_USD,
} from '@/lib/billing/credit-economics'
import { syncSubscriptionCreditsFromPlanAction } from '@/app/actions/subscription-credits'

/** Matches Billing → Top Up Credits primary buttons (standalone strings for this module). */
const TOPUP_BTN_CLASS =
  'relative z-[1] h-auto min-h-10 w-full max-w-full whitespace-normal px-3 py-2.5 text-balance leading-snug sm:min-h-11 sm:py-3 rounded-xl bg-foreground font-medium text-background shadow-sm transition-opacity hover:opacity-90'

export type CreditInsufficientCreditsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  requiredCredits?: number
  used?: number
  limit?: number
  contextLabel?: string
}

export function CreditInsufficientCreditsModal({
  open,
  onOpenChange,
  requiredCredits,
  used,
  limit,
  contextLabel,
}: CreditInsufficientCreditsModalProps) {
  const router = useRouter()
  const [autoTopupKey, setAutoTopupKey] = useState(0)
  const [customTopupAmount, setCustomTopupAmount] = useState(String(CUSTOM_CREDIT_TOPUP_DEFAULT_USD))

  const afterCreditPurchase = useCallback(async () => {
    await syncSubscriptionCreditsFromPlanAction()
    router.refresh()
    setAutoTopupKey((k) => k + 1)
  }, [router])

  const afterAutoTopupSaved = useCallback(async () => {
    router.refresh()
    setAutoTopupKey((k) => k + 1)
  }, [router])

  const customTopupUsd = Number.parseInt(customTopupAmount, 10)
  const customTopupValid = Number.isFinite(customTopupUsd) && customTopupUsd >= CUSTOM_CREDIT_TOPUP_MIN_USD

  const usageLine =
    typeof used === 'number' && typeof limit === 'number'
      ? `${used.toLocaleString()} / ${limit.toLocaleString()} credits used this cycle`
      : typeof requiredCredits === 'number'
        ? `This action needs about ${requiredCredits.toLocaleString()} credits.`
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        overlayClassName="z-[100]"
        className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-xl z-[100]"
      >
        <DialogHeader className="space-y-2 border-b border-border/40 px-6 py-5 text-left sm:px-8 sm:py-6">
          <DialogTitle className="text-left text-[1.125rem] font-semibold leading-snug tracking-tight">
            Insufficient AI credits
          </DialogTitle>
          <DialogDescription className="text-left text-[13px] leading-relaxed">
            {contextLabel ? (
              <span className="block text-foreground/90">{contextLabel}</span>
            ) : null}
            {usageLine ? (
              <span
                className={
                  contextLabel ? 'mt-1 block text-muted-foreground' : 'block text-muted-foreground'
                }
              >
                {usageLine}
              </span>
            ) : (
              <span
                className={
                  contextLabel ? 'mt-1 block text-muted-foreground' : 'block text-muted-foreground'
                }
              >
                Add credits with a one-time top-up or enable automatic top-up below.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <section className="space-y-3">
            <p className="text-[13px] font-medium text-foreground">One-time top-up</p>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
              <Checkout
                productId="credit-topup-2000"
                buttonText={
                  <>
                    <span className="block leading-tight">500 credits</span>
                    <span className="mt-0.5 block text-xs font-normal opacity-90">$5</span>
                  </>
                }
                buttonClassName={TOPUP_BTN_CLASS}
                onComplete={afterCreditPurchase}
              />
              <Checkout
                productId="credit-topup-5000"
                buttonText={
                  <>
                    <span className="block leading-tight">1,000 credits</span>
                    <span className="mt-0.5 block text-xs font-normal opacity-90">$10</span>
                  </>
                }
                buttonClassName={TOPUP_BTN_CLASS}
                onComplete={afterCreditPurchase}
              />
              <Checkout
                productId="credit-topup-10000"
                buttonText={
                  <>
                    <span className="block leading-tight">2,500 credits</span>
                    <span className="mt-0.5 block text-xs font-normal opacity-90">$25</span>
                  </>
                }
                buttonClassName={TOPUP_BTN_CLASS}
                onComplete={afterCreditPurchase}
              />
            </div>
            <div className="rounded-xl border border-border/35 bg-background/30 p-4 backdrop-blur-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
                <div className="min-w-0 shrink-0 space-y-2 lg:w-48 xl:w-52">
                  <Label htmlFor="insufficient-modal-custom-topup">Custom amount</Label>
                  <Input
                    id="insufficient-modal-custom-topup"
                    type="number"
                    min={CUSTOM_CREDIT_TOPUP_MIN_USD}
                    step={1}
                    value={customTopupAmount}
                    onChange={(e) => setCustomTopupAmount(e.target.value)}
                    onBlur={(e) => {
                      const v = Number.parseInt(e.target.value, 10)
                      if (Number.isFinite(v) && v < CUSTOM_CREDIT_TOPUP_MIN_USD) {
                        setCustomTopupAmount(String(CUSTOM_CREDIT_TOPUP_MIN_USD))
                      }
                    }}
                    className="bg-background/70"
                    placeholder={String(CUSTOM_CREDIT_TOPUP_DEFAULT_USD)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum ${CUSTOM_CREDIT_TOPUP_MIN_USD} for checkout (100 credits per $1)
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <Checkout
                    productId="credit-topup-custom"
                    customTopupUsdAmount={customTopupUsd}
                    disabled={!customTopupValid}
                    buttonText={
                      customTopupValid ? (
                        <>
                          <span className="block font-medium leading-tight">Purchase credits</span>
                          <span className="mt-1 block text-xs font-normal leading-snug opacity-90">
                            ${customTopupUsd} · {(customTopupUsd * 100).toLocaleString()} credits
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block font-medium leading-tight">Purchase credits</span>
                          <span className="mt-1 block text-xs font-normal opacity-90">
                            Enter at least ${CUSTOM_CREDIT_TOPUP_MIN_USD}
                          </span>
                        </>
                      )
                    }
                    buttonClassName={TOPUP_BTN_CLASS}
                    onComplete={afterCreditPurchase}
                  />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-[13px] font-medium text-foreground">Automatic top-up</p>
            <CreditAutoTopupSettings key={autoTopupKey} compact onSaved={afterAutoTopupSaved} />
          </section>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-border/40 px-6 py-4 sm:flex-row sm:px-8">
          <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href={USAGE_CREDITS_TAB_HREF}>Manage usage &amp; ledger</Link>
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
