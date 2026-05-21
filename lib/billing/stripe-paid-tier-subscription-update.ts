import type Stripe from 'stripe'
import { PAID_PLAN_ID } from '@/lib/billing/access'
import { sortFocusPlatforms, type AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { getMonthlyPriceCents, getTierByIndex, type BillingVariant } from '@/lib/pricing-matrix'

export function focusPlatformsForPaidSubscriptionRow(row: {
  billing_variant: string | null
  billing_focus_platforms: unknown
}): AdultBillingPlatform[] | undefined {
  if (row.billing_variant === 'multi') {
    const raw = row.billing_focus_platforms
    if (
      Array.isArray(raw) &&
      raw.some((x) => String(x).toLowerCase().trim() === 'manyvids')
    ) {
      return ['onlyfans', 'fansly', 'manyvids']
    }
    return undefined
  }
  const raw = row.billing_focus_platforms
  if (Array.isArray(raw) && raw.length > 0) {
    return sortFocusPlatforms(raw as string[])
  }
  return ['onlyfans']
}

/**
 * Updates the main paid subscription item to a target revenue tier (same shape as checkout metadata).
 * Used by the nightly align cron (`proration_behavior: 'none'`) and immediate catch-up (`create_prorations`).
 */
export async function updateStripePaidSubscriptionItemToTier(params: {
  stripe: Stripe
  stripeSubscriptionId: string
  userId: string
  variant: BillingVariant
  focusPlatforms: AdultBillingPlatform[] | undefined
  seats: number
  targetTierIndex: number
  prorationBehavior: 'none' | 'create_prorations'
}): Promise<void> {
  const {
    stripe,
    stripeSubscriptionId,
    userId,
    variant,
    focusPlatforms,
    seats,
    targetTierIndex,
    prorationBehavior,
  } = params

  const pricePlatforms: AdultBillingPlatform[] | null | undefined =
    variant === 'multi' && focusPlatforms?.length && sortFocusPlatforms(focusPlatforms).includes('manyvids')
      ? (['onlyfans', 'fansly', 'manyvids'] as AdultBillingPlatform[])
      : focusPlatforms
  const unitCents = getMonthlyPriceCents(variant, targetTierIndex, pricePlatforms)

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['items.data.price.product'],
  })
  const item = sub.items.data[0]
  if (!item?.id) {
    throw new Error('No subscription item')
  }
  const productRef = item.price?.product
  const productId =
    typeof productRef === 'string'
      ? productRef
      : productRef && typeof productRef === 'object' && 'id' in productRef
        ? String((productRef as { id: string }).id)
        : null
  if (!productId) {
    throw new Error('Missing Stripe product on subscription item')
  }

  const tierRow = getTierByIndex(targetTierIndex)
  let focusList = ''
  let focusLegacy = ''
  if (variant === 'single') {
    const fps = focusPlatforms ?? ['onlyfans']
    const sorted = sortFocusPlatforms(fps)
    focusList = sorted.join(',')
    focusLegacy = sorted[0] ?? 'onlyfans'
  } else if (variant === 'multi') {
    if (focusPlatforms?.length && sortFocusPlatforms(focusPlatforms).includes('manyvids')) {
      focusList = 'manyvids'
      focusLegacy = 'manyvids'
    }
  }

  const meta: Record<string, string> = {
    ...(sub.metadata ?? {}),
    productId: (sub.metadata?.productId as string) || PAID_PLAN_ID,
    userId,
    billingVariant: variant,
    revenueTier: String(targetTierIndex),
    revenueBandLabel: tierRow?.label ?? '',
    focusPlatforms: focusList,
    focusPlatform: focusLegacy,
    seats: String(seats),
  }

  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: item.id,
        price_data: {
          currency: 'usd',
          product: productId,
          recurring: { interval: 'month' },
          unit_amount: unitCents,
        },
        quantity: seats,
      },
    ],
    proration_behavior: prorationBehavior,
    metadata: meta,
  })
}
