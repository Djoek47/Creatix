import 'server-only'

import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'

/**
 * Stripe API `2026-03-25.dahlia`: inline **`price_data.product_data`** was removed where a
 * **Product id** is required (`product: prod_…`). Applies to subscription items and Checkout
 * `line_items` that use dynamic `price_data`.
 *
 * @see subscription `items[].price_data` — only `currency`, `product`, `unit_amount`, `recurring`, tax fields
 */
export async function stripeProductForInlinePriceData(params: {
  name: string
  description?: string
  metadata?: Stripe.MetadataParam
  idempotencyKey?: string
}): Promise<Stripe.Product> {
  const stripe = getStripe()
  return stripe.products.create(
    {
      name: params.name,
      ...(params.description !== undefined && params.description !== ''
        ? { description: params.description }
        : {}),
      metadata: params.metadata ?? {},
    },
    params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {},
  )
}
