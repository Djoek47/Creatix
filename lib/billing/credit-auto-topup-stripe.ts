import 'server-only'

import Stripe from 'stripe'

import { getStripe } from '@/lib/stripe'
import { getProduct } from '@/lib/products'

export async function resolveDefaultPaymentMethodId(
  stripeCustomerId: string,
): Promise<string | null> {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ['invoice_settings.default_payment_method'],
  })
  if (customer.deleted) return null

  const inv = customer.invoice_settings?.default_payment_method
  if (typeof inv === 'string' && inv) return inv
  if (inv && typeof inv === 'object' && 'id' in inv && typeof inv.id === 'string') {
    return inv.id
  }

  const defSource = customer.default_source
  if (typeof defSource === 'string' && defSource) return defSource

  return null
}

export type CreateAutoTopupPaymentIntentParams = {
  stripeCustomerId: string
  userId: string
  packId: string
  credits: number
  amountUsdCents: number
  idempotencyKey: string
}

/**
 * Create and confirm an off-session PaymentIntent for automatic credit top-up.
 * Credits are granted only in webhook on payment_intent.succeeded.
 */
export async function createConfirmedAutoTopupPaymentIntent(
  params: CreateAutoTopupPaymentIntentParams,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe()
  const paymentMethodId = await resolveDefaultPaymentMethodId(params.stripeCustomerId)
  if (!paymentMethodId) {
    const err = new Error('missing_default_payment_method')
    ;(err as Error & { code?: string }).code = 'missing_default_payment_method'
    throw err
  }

  const product = getProduct(params.packId)
  const descriptorSuffix = product?.name ? ` · ${product.name.slice(0, 12)}` : ''

  return stripe.paymentIntents.create(
    {
      amount: params.amountUsdCents,
      currency: 'usd',
      customer: params.stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Auto credit top-up (${params.credits} credits)`,
      statement_descriptor_suffix: `AUTO TOPUP${descriptorSuffix}`.slice(0, 22),
      metadata: {
        type: 'credit_topup_auto',
        userId: params.userId,
        packId: params.packId,
        credits: String(params.credits),
        idempotencyScope: 'auto_topup',
      },
    },
    { idempotencyKey: params.idempotencyKey },
  )
}
