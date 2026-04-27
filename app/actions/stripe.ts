'use server'

import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { PRODUCTS, getProduct } from '@/lib/products'
import { createClient } from '@/lib/supabase/server'
import {
  subscriptionFinancialFieldsFromMerged,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'
import { PAID_PLAN_ID, isPaidPlanId } from '@/lib/billing/access'
import {
  TIER_COUNT,
  checkoutProductDescription,
  checkoutProductName,
  getMonthlyPriceCents,
  getTierByIndex,
  focusPlatformsShortLabel,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import {
  ADULT_BILLING_PLATFORMS,
  parseFocusPlatformsFromComma,
  sortFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { getSubscriptionPeriodSeconds } from '@/lib/billing/stripe-subscription'
import { DEFAULT_BILLING_SEATS, MAX_BILLING_SEATS } from '@/lib/billing/seats'
import { getAppUrl } from '@/lib/site-url'

const TRIAL_DURATION_DAYS = 2

function clampBillingSeats(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_BILLING_SEATS
  return Math.min(MAX_BILLING_SEATS, Math.max(1, Math.floor(n)))
}

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
  billing_focus_platforms?: string[] | null
  billing_seats?: number | null
}

async function upsertSubscriptionRow(userId: string, patch: SubscriptionRowUpdate) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('subscriptions')
    .select(
      'plan_id,billing_variant,revenue_tier,billing_focus_platform,billing_focus_platforms,billing_seats',
    )
    .eq('user_id', userId)
    .maybeSingle()

  const ex = existing as {
    plan_id?: string | null
    billing_variant?: string | null
    revenue_tier?: number | null
    billing_focus_platform?: string | null
    billing_focus_platforms?: string[] | null
    billing_seats?: number | null
  } | null

  const merged: SubscriptionRowForCredits = {
    plan_id: (patch.plan_id ?? ex?.plan_id) as string | null | undefined,
    billing_variant: (patch.billing_variant ?? ex?.billing_variant) as string | null,
    revenue_tier: (patch.revenue_tier ?? ex?.revenue_tier) as number | null,
    billing_focus_platform: (patch.billing_focus_platform ?? ex?.billing_focus_platform) as string | null,
    billing_focus_platforms: (patch.billing_focus_platforms ?? ex?.billing_focus_platforms) as
      | string[]
      | null,
    billing_seats: (patch.billing_seats ?? ex?.billing_seats) as number | null,
  }

  const { storage_limit_mb, ai_credits_limit } = subscriptionFinancialFieldsFromMerged(merged)

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      ...patch,
      storage_limit_mb,
      ai_credits_limit,
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
  if (product.id === 'divine-trial') {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      redirect_on_completion: 'never',
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      metadata: {
        productId: product.id,
        userId: user.id,
        type: 'trial_setup',
        trialDays: String(TRIAL_DURATION_DAYS),
      },
    })
    if (!session.client_secret) {
      throw new Error('Stripe Checkout did not return client_secret')
    }
    return session.client_secret
  }

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    ui_mode: 'embedded_page',
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
      ...(typeof product.credits === 'number'
        ? {
            type: 'credit_topup',
            packId: product.id,
            credits: String(product.credits),
          }
        : {}),
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

export async function startCreditTopupCheckout(packId: string) {
  const pack = getProduct(packId)
  if (!pack || typeof pack.credits !== 'number' || pack.mode !== 'payment') {
    throw new Error('Invalid credit pack')
  }
  return startCheckoutSession(packId)
}

export async function startCustomCreditTopupCheckout(amountUsd: number) {
  const normalizedAmount = Number(amountUsd)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 25) {
    throw new Error('Custom top-up minimum is $25')
  }
  const roundedUsd = Math.round(normalizedAmount)
  const amountCents = roundedUsd * 100
  const credits = roundedUsd * 100

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded_page',
    redirect_on_completion: 'never',
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Custom Credit Top-Up · ${credits.toLocaleString()} credits`,
            description: 'One-time custom top-up for high-usage months',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      productId: 'credit-topup-custom',
      userId: user.id,
      type: 'credit_topup',
      packId: 'credit-topup-custom',
      credits: String(credits),
      customUsdAmount: String(roundedUsd),
    },
  })

  if (!session.client_secret) {
    throw new Error('Stripe Checkout did not return client_secret')
  }
  return session.client_secret
}

function paidCheckoutMetadata(
  userId: string,
  variant: BillingVariant,
  tierIndex: number,
  focusPlatforms: AdultBillingPlatform[] | null,
  seats: number,
) {
  const row = getTierByIndex(tierIndex)
  const sorted =
    variant === 'single' && focusPlatforms?.length
      ? sortFocusPlatforms(focusPlatforms)
      : []
  const focusPlatformsStr = sorted.length ? sorted.join(',') : ''
  const focusPlatformLegacy = sorted[0] ?? ''
  return {
    productId: PAID_PLAN_ID,
    userId,
    billingVariant: variant,
    revenueTier: String(tierIndex),
    revenueBandLabel: row?.label ?? '',
    focusPlatforms: focusPlatformsStr,
    focusPlatform: focusPlatformLegacy,
    seats: String(seats),
  } as const
}

/** Revenue-tier monthly subscription (Focus 1–2 platforms vs Unified × tier index). */
export async function startPaidSubscriptionCheckout(params: {
  variant: BillingVariant
  tierIndex: number
  /** Focus (`single`): 1–2 platforms; ignored for Unified (`multi`). */
  focusPlatforms?: AdultBillingPlatform[] | null
  /** Managers on the same creator account; unit price × seats. */
  seats?: number
}) {
  const { variant, tierIndex, focusPlatforms: fpIn } = params
  const seats = clampBillingSeats(params.seats ?? DEFAULT_BILLING_SEATS)
  if (tierIndex < 0 || tierIndex >= TIER_COUNT) {
    throw new Error(`Invalid revenue tier: ${tierIndex}`)
  }

  let focusPlatforms: AdultBillingPlatform[] | null = null
  if (variant === 'single') {
    const sorted = sortFocusPlatforms(fpIn?.length ? fpIn : ['onlyfans'])
    if (sorted.length === 0 || sorted.length > 2) {
      throw new Error('Focus requires 1 or 2 platforms')
    }
    focusPlatforms = sorted
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const customerId = await findOrCreateStripeCustomer({ userId: user.id, email: user.email })
  const meta = paidCheckoutMetadata(user.id, variant, tierIndex, focusPlatforms, seats)
  const unitAmount = getMonthlyPriceCents(variant, tierIndex, focusPlatforms ?? undefined)

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded_page',
    redirect_on_completion: 'never',
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: checkoutProductName(variant, tierIndex, focusPlatforms ?? undefined),
            description: checkoutProductDescription(variant, tierIndex, focusPlatforms ?? undefined),
          },
          unit_amount: unitAmount,
          recurring: { interval: 'month' },
        },
        quantity: seats,
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

  const appUrl = getAppUrl()

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

  const appUrl = getAppUrl()
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
  items?: Stripe.ApiList<Stripe.SubscriptionItem> | null
}): {
  planId: string | undefined
  billing_variant: string | null
  revenue_tier: number | null
  revenue_band_label: string | null
  billing_focus_platform: string | null
  billing_focus_platforms: string[] | null
  billing_seats: number
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

  let billing_focus_platforms: string[] | null = null
  if (billing_variant === 'single') {
    const parsedList =
      typeof m.focusPlatforms === 'string' ? parseFocusPlatformsFromComma(m.focusPlatforms) : null
    if (parsedList && parsedList.length >= 1 && parsedList.length <= 2) {
      billing_focus_platforms = parsedList
    } else {
      const fpRaw = typeof m.focusPlatform === 'string' ? m.focusPlatform.toLowerCase().trim() : ''
      if (fpRaw && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(fpRaw)) {
        billing_focus_platforms = [fpRaw]
      } else {
        billing_focus_platforms = ['onlyfans']
      }
    }
  }

  const billing_focus_platform = billing_focus_platforms?.[0] ?? null

  const qty = sub.items?.data?.[0]?.quantity
  const metaSeats = typeof m.seats === 'string' && m.seats !== '' ? Number.parseInt(m.seats, 10) : Number.NaN
  const billing_seats = clampBillingSeats(
    typeof qty === 'number' && qty >= 1 ? qty : Number.isFinite(metaSeats) ? metaSeats : DEFAULT_BILLING_SEATS,
  )

  return {
    planId: productId,
    billing_variant,
    revenue_tier: Number.isFinite(revenue_tier) ? revenue_tier : null,
    revenue_band_label,
    billing_focus_platform,
    billing_focus_platforms,
    billing_seats,
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
      'plan_id,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id,billing_variant,billing_focus_platform,billing_focus_platforms,revenue_tier,revenue_band_label,billing_seats',
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
          const parsed = parseStripeSubscriptionMeta({
            metadata: stripeSub.metadata,
            items: stripeSub.items,
          })
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
              parsed.billing_variant === 'single' ? (parsed.billing_focus_platform ?? 'onlyfans') : null,
            billing_focus_platforms:
              parsed.billing_variant === 'single' ? parsed.billing_focus_platforms : null,
            revenue_tier: parsed.revenue_tier,
            revenue_band_label: parsed.revenue_band_label,
            billing_seats: parsed.billing_seats,
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
                ? (parsed.billing_focus_platform ??
                  (data as { billing_focus_platform?: string | null }).billing_focus_platform ??
                  'onlyfans')
                : parsed.billing_variant === 'multi'
                  ? null
                  : (data as { billing_focus_platform?: string | null }).billing_focus_platform,
            billing_focus_platforms:
              parsed.billing_variant === 'single'
                ? (parsed.billing_focus_platforms ??
                  (data as { billing_focus_platforms?: string[] | null }).billing_focus_platforms)
                : parsed.billing_variant === 'multi'
                  ? null
                  : (data as { billing_focus_platforms?: string[] | null }).billing_focus_platforms,
            revenue_tier: parsed.revenue_tier ?? data.revenue_tier,
            revenue_band_label: parsed.revenue_band_label ?? data.revenue_band_label,
            billing_seats: parsed.billing_seats,
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
    const fps = (data as { billing_focus_platforms?: string[] | null }).billing_focus_platforms
    const leg = (data as { billing_focus_platform?: string | null }).billing_focus_platform
    const sorted =
      fps?.length && fps.length <= 2
        ? sortFocusPlatforms(fps as AdultBillingPlatform[])
        : leg && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(leg)
          ? [leg as AdultBillingPlatform]
          : (['onlyfans'] as AdultBillingPlatform[])
    const vlab =
      bv === 'multi' ? 'Unified' : bv === 'single' ? `Focus (${focusPlatformsShortLabel(sorted)})` : ''
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
    billingFocusPlatforms: (() => {
      const fps = (data as { billing_focus_platforms?: string[] | null }).billing_focus_platforms
      if (fps?.length) return sortFocusPlatforms(fps as AdultBillingPlatform[])
      const leg = (data as { billing_focus_platform?: string | null }).billing_focus_platform
      if (leg && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(leg)) {
        return [leg as AdultBillingPlatform]
      }
      return undefined
    })(),
    revenueTier: data.revenue_tier as number | null | undefined,
    revenueBandLabel: data.revenue_band_label as string | null | undefined,
    billingSeats:
      typeof (data as { billing_seats?: number }).billing_seats === 'number' &&
      (data as { billing_seats?: number }).billing_seats! >= 1
        ? (data as { billing_seats: number }).billing_seats
        : DEFAULT_BILLING_SEATS,
  }
}
