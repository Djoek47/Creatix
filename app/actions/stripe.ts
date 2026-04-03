'use server'

import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { PRODUCTS } from '@/lib/products'
import { createClient } from '@/lib/supabase/server'
import { getPlanLimits } from '@/lib/billing/plan-limits'
import { PAID_PLAN_ID, isPaidPlanId } from '@/lib/billing/access'
import {
  TIER_COUNT,
  checkoutProductDescription,
  checkoutProductName,
  getMonthlyPriceCents,
  getTierByIndex,
  focusPlatformDisplayName,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import {
  ADULT_BILLING_PLATFORMS,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { getSubscriptionPeriodSeconds } from '@/lib/billing/stripe-subscription'

type SubscriptionRowUpdate = {
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan_id?: string
  status?: string
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  billing_variant?: string | null
  revenue_tier?: number | null
  revenue_band_label?: string | null
  billing_focus_platform?: string | null
}

async function upsertSubscriptionRow(
  userId: string,
  patch: SubscriptionRowUpdate & Partial<ReturnType<typeof getPlanLimits>>,
) {
  const supabase = await createClient()
  const planId = patch.plan_id
  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      ...patch,
      ...(planId ? getPlanLimits(planId) : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

async function findOrCreateStripeCustomer(params: { userId: string; email: string }) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', params.userId)
    .maybeSingle()

  if (existing?.stripe_customer_id) return existing.stripe_customer_id

  const stripe = getStripe()
  const customers = await stripe.customers.list({ email: params.email, limit: 1 })
  const customerId =
    customers.data[0]?.id ??
    (
      await stripe.customers.create({
        email: params.email,
        metadata: { userId: params.userId },
      })
    ).id

  await upsertSubscriptionRow(params.userId, { stripe_customer_id: customerId })
  return customerId
}

/** Trial / one-off checkout (e.g. divine-trial). */
export async function startCheckoutSession(productId: string) {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })

  const stripe = getStripe()
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
          ...(product.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      },
    ],
    mode: product.mode,
    metadata: {
      productId: product.id,
      userId: user.id,
    },
    ...(product.mode === 'subscription'
      ? {
          subscription_data: {
            metadata: {
              productId: product.id,
              userId: user.id,
            },
          },
        }
      : {}),
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)
  if (!session.client_secret) {
    throw new Error('Stripe Checkout did not return client_secret')
  }
  return session.client_secret
}

function paidCheckoutMetadata(
  userId: string,
  variant: BillingVariant,
  tierIndex: number,
  focusPlatform: AdultBillingPlatform | null,
) {
  const row = getTierByIndex(tierIndex)
  return {
    productId: PAID_PLAN_ID,
    userId,
    billingVariant: variant,
    revenueTier: String(tierIndex),
    revenueBandLabel: row?.label ?? '',
    focusPlatform: variant === 'single' && focusPlatform ? focusPlatform : '',
  } as const
}

function assertValidFocusPlatform(p: string): asserts p is AdultBillingPlatform {
  if (!(ADULT_BILLING_PLATFORMS as readonly string[]).includes(p)) {
    throw new Error(`Invalid focus platform: ${p}`)
  }
}

/** Revenue-tier monthly subscription (Focus vs Unified × tier index). */
export async function startPaidSubscriptionCheckout(params: {
  variant: BillingVariant
  tierIndex: number
  /** Required for Focus (`single`); ignored for Unified (`multi`). */
  focusPlatform?: AdultBillingPlatform | null
}) {
  const { variant, tierIndex, focusPlatform: fpIn } = params
  if (tierIndex < 0 || tierIndex >= TIER_COUNT) {
    throw new Error(`Invalid revenue tier: ${tierIndex}`)
  }

  let focusPlatform: AdultBillingPlatform | null = null
  if (variant === 'single') {
    const raw = (fpIn ?? 'onlyfans').toLowerCase()
    assertValidFocusPlatform(raw)
    focusPlatform = raw
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })
  const meta = paidCheckoutMetadata(user.id, variant, tierIndex, focusPlatform)
  const unitAmount = getMonthlyPriceCents(
    variant,
    tierIndex,
    focusPlatform ?? 'onlyfans',
  )

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: checkoutProductName(variant, tierIndex, focusPlatform ?? 'onlyfans'),
            description: checkoutProductDescription(variant, tierIndex, focusPlatform ?? 'onlyfans'),
          },
          unit_amount: unitAmount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    metadata: { ...meta },
    subscription_data: {
      metadata: { ...meta },
    },
  })

  if (!session.client_secret) {
    throw new Error('Stripe Checkout did not return client_secret')
  }
  return session.client_secret
}

export async function createCustomerPortalSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }
  if (!user.email) {
    throw new Error('User email missing')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circe-venus.vercel.app'

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/settings?tab=billing`,
  })

  return session.url
}

/**
 * Targeted portal flows. Note: with dynamic Checkout `price_data`, Stripe Customer Portal may not
 * expose all 22 price points — users change tier/variant in-app (new Checkout) or cancel and resubscribe.
 */
export async function createCustomerPortalSessionForFlow(
  flow: 'payment_method_update' | 'subscription_cancel' | 'subscription_update',
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')
  if (!user.email) throw new Error('User email missing')

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circe-venus.vercel.app'
  const return_url = `${appUrl}/dashboard/settings?tab=billing`

  const subscriptionId = subRow?.stripe_subscription_id || undefined

  const flow_data =
    flow === 'payment_method_update'
      ? { type: 'payment_method_update' as const }
      : flow === 'subscription_cancel'
        ? subscriptionId
          ? ({ type: 'subscription_cancel' as const, subscription: subscriptionId } as const)
          : undefined
        : subscriptionId
          ? ({ type: 'subscription_update' as const, subscription: subscriptionId } as const)
          : undefined

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url,
    ...(flow_data ? { flow_data } : {}),
  })

  return session.url
}

function parseStripeSubscriptionMeta(sub: {
  metadata?: Record<string, string> | null
}): {
  planId: string | undefined
  billing_variant: string | null
  revenue_tier: number | null
  revenue_band_label: string | null
  billing_focus_platform: string | null
} {
  const m = sub.metadata || {}
  const productId = (m.productId as string | undefined) || undefined
  const billing_variant =
    m.billingVariant === 'single' || m.billingVariant === 'multi' ? m.billingVariant : null
  const tierRaw = m.revenueTier
  const revenue_tier =
    typeof tierRaw === 'string' && tierRaw !== '' ? Number.parseInt(tierRaw, 10) : Number.NaN
  const revenue_band_label =
    typeof m.revenueBandLabel === 'string' && m.revenueBandLabel.length > 0
      ? m.revenueBandLabel
      : null
  const fpRaw = typeof m.focusPlatform === 'string' ? m.focusPlatform.toLowerCase().trim() : ''
  const billing_focus_platform =
    fpRaw && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(fpRaw) ? fpRaw : null

  return {
    planId: productId,
    billing_variant,
    revenue_tier: Number.isFinite(revenue_tier) ? revenue_tier : null,
    revenue_band_label,
    billing_focus_platform,
  }
}

export async function getSubscriptionStatus() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'none', plan: null }
  }

  let { data } = await supabase
    .from('subscriptions')
    .select(
      'plan_id,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id,billing_variant,billing_focus_platform,revenue_tier,revenue_band_label',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return { status: 'none', plan: null }

  const needsSync =
    !data.plan_id ||
    !data.status ||
    data.status === 'trial' ||
    !data.stripe_subscription_id

  try {
    if (needsSync) {
      let customerId = data.stripe_customer_id as string | null | undefined

      if (!customerId && user.email) {
        customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })
      }

      if (customerId) {
        const stripe = getStripe()
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 1,
          expand: ['data.items'],
        })

        const sub = subs.data[0]
        if (sub) {
          const stripeSub = sub as Stripe.Subscription
          const parsed = parseStripeSubscriptionMeta(stripeSub)
          const planIdFromMetadata = parsed.planId || data.plan_id
          const normalizedPlan =
            planIdFromMetadata && isPaidPlanId(planIdFromMetadata) ? PAID_PLAN_ID : planIdFromMetadata
          const period = getSubscriptionPeriodSeconds(stripeSub)

          await upsertSubscriptionRow(user.id, {
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSub.id,
            plan_id: normalizedPlan || undefined,
            status: stripeSub.status,
            ...(period
              ? {
                  current_period_start: new Date(period.start * 1000).toISOString(),
                  current_period_end: new Date(period.end * 1000).toISOString(),
                }
              : {}),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            billing_variant: parsed.billing_variant,
            billing_focus_platform:
              parsed.billing_variant === 'single'
                ? parsed.billing_focus_platform ?? 'onlyfans'
                : null,
            revenue_tier: parsed.revenue_tier,
            revenue_band_label: parsed.revenue_band_label,
          })

          data = {
            ...data,
            plan_id: normalizedPlan,
            status: stripeSub.status,
            ...(period
              ? { current_period_end: new Date(period.end * 1000).toISOString() }
              : {}),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            billing_variant: parsed.billing_variant ?? data.billing_variant,
            billing_focus_platform:
              parsed.billing_variant === 'single'
                ? (parsed.billing_focus_platform ?? data.billing_focus_platform ?? 'onlyfans')
                : (parsed.billing_variant === 'multi' ? null : data.billing_focus_platform),
            revenue_tier: parsed.revenue_tier ?? data.revenue_tier,
            revenue_band_label: parsed.revenue_band_label ?? data.revenue_band_label,
          } as typeof data
        }
      }
    }
  } catch {
    // fall back to DB
  }

  const planId = data.plan_id as string
  const paid = isPaidPlanId(planId)
  let planLabel: string | null = null
  if (paid) {
    const tierIdx = data.revenue_tier
    const bv = data.billing_variant
    const row = typeof tierIdx === 'number' ? getTierByIndex(tierIdx) : undefined
    const focus = (data as { billing_focus_platform?: string | null }).billing_focus_platform
    const vlab =
      bv === 'multi'
        ? 'Unified'
        : bv === 'single'
          ? `Focus (${focusPlatformDisplayName(
              (focus === 'onlyfans' || focus === 'fansly' || focus === 'manyvids'
                ? focus
                : 'onlyfans') as AdultBillingPlatform,
            )})`
          : ''
    const band = row?.label || (data.revenue_band_label as string) || ''
    planLabel = [band, vlab].filter(Boolean).join(' · ') || 'Circe et Venus Pro'
  } else {
    const product = PRODUCTS.find((p) => p.id === planId)
    planLabel = product?.name || planId || null
  }

  return {
    status: data.status,
    plan: planLabel,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end).toISOString() : undefined,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? undefined,
    planId: data.plan_id,
    billingVariant: data.billing_variant as BillingVariant | null | undefined,
    billingFocusPlatform: (data as { billing_focus_platform?: string | null }).billing_focus_platform as
      | AdultBillingPlatform
      | null
      | undefined,
    revenueTier: data.revenue_tier as number | null | undefined,
    revenueBandLabel: data.revenue_band_label as string | null | undefined,
  }
}
