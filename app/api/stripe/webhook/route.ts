import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import {
  insertDivineAppNotification,
  type NotificationInsertClient,
} from '@/lib/notifications/divine-app-notification'
import {
  subscriptionFinancialFieldsFromMerged,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'
import { isPaidPlanId, PAID_PLAN_ID } from '@/lib/billing/access'
import { getSubscriptionPeriodSeconds } from '@/lib/billing/stripe-subscription'
import { ADULT_BILLING_PLATFORMS, parseFocusPlatformsFromComma } from '@/lib/billing/platform-variant'
import { grantPurchasedCredits } from '@/lib/billing/credit-wallet'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

function normalizePlanId(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return isPaidPlanId(raw) ? PAID_PLAN_ID : raw
}

function metaPatch(meta: Record<string, string> | null | undefined) {
  if (!meta) return {}
  const billingVariant =
    meta.billingVariant === 'single' || meta.billingVariant === 'multi' ? meta.billingVariant : null
  const tierRaw = meta.revenueTier
  const revenue_tier =
    typeof tierRaw === 'string' && tierRaw !== '' ? Number.parseInt(tierRaw, 10) : Number.NaN
  const revenue_band_label =
    typeof meta.revenueBandLabel === 'string' && meta.revenueBandLabel.length > 0
      ? meta.revenueBandLabel
      : null

  let billing_focus_platforms: string[] | null = null
  if (billingVariant === 'single') {
    const parsedList =
      typeof meta.focusPlatforms === 'string' ? parseFocusPlatformsFromComma(meta.focusPlatforms) : null
    if (parsedList && parsedList.length >= 1 && parsedList.length <= 2) {
      billing_focus_platforms = parsedList
    } else {
      const fpRaw = typeof meta.focusPlatform === 'string' ? meta.focusPlatform.toLowerCase().trim() : ''
      if (fpRaw && (ADULT_BILLING_PLATFORMS as readonly string[]).includes(fpRaw)) {
        billing_focus_platforms = [fpRaw]
      } else {
        billing_focus_platforms = ['onlyfans']
      }
    }
  }

  const billing_focus_platform = billing_focus_platforms?.[0] ?? null

  const seatsRaw = meta?.seats
  const billing_seats =
    typeof seatsRaw === 'string' && seatsRaw !== ''
      ? Math.min(50, Math.max(1, Math.floor(Number.parseInt(seatsRaw, 10))))
      : null

  return {
    billing_variant: billingVariant,
    revenue_tier: Number.isFinite(revenue_tier) ? revenue_tier : null,
    revenue_band_label,
    billing_focus_platform,
    billing_focus_platforms,
    billing_seats,
  }
}

async function upsertSubscriptionByUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- service-role client from createClient
  supabase: any,
  userId: string,
  patch: Record<string, unknown>,
) {
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
    } as any,
    { onConflict: 'user_id' },
  )
}

async function notifyPlanChange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  planId: string | undefined,
) {
  const n = planId?.toLowerCase()
  if (!n || !isPaidPlanId(n)) return
  await insertDivineAppNotification(supabase as NotificationInsertClient, userId, {
    type: 'system',
    title: 'Plan upgraded',
    description: 'Your Pro plan is now active. You have full access to Circe & Venus tools.',
    link: '/dashboard/ai-studio',
    metadata: { kind: 'billing' },
  })
}

async function upsertSubscriptionByStripeCustomerId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  stripeCustomerId: string,
  patch: Record<string, unknown>,
) {
  const { data: existingRow } = await supabase
    .from('subscriptions')
    .select('user_id,current_period_start,last_reset_at,plan_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  const existing = existingRow as {
    user_id: string
    current_period_start: string | null
    plan_id: string | null
  } | null

  if (!existing?.user_id) return

  const incomingStart = patch.current_period_start as string | undefined
  const existingStart = existing.current_period_start
  const shouldReset =
    typeof incomingStart === 'string' &&
    incomingStart.length > 0 &&
    (!existingStart || new Date(incomingStart).getTime() !== new Date(existingStart).getTime())

  const resetPatch = shouldReset
    ? {
        ai_credits_used: 0,
        messages_sent: 0,
        api_calls_used: 0,
        last_reset_at: new Date().toISOString(),
      }
    : {}

  const incomingPlanId = (patch.plan_id as string | undefined)?.toLowerCase()
  const wasPro = existing.plan_id && isPaidPlanId(String(existing.plan_id))
  const isPro = incomingPlanId && isPaidPlanId(incomingPlanId)

  await upsertSubscriptionByUserId(supabase, existing.user_id, { ...patch, ...resetPatch })

  if (isPro && !wasPro) {
    await notifyPlanChange(supabase, existing.user_id, patch.plan_id as string | undefined)
  }
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const meta = session.metadata as Record<string, string> | undefined
        const isCreditTopup = meta?.type === 'credit_topup'
        if (isCreditTopup && userId) {
          const credits = Number.parseInt(meta?.credits ?? '0', 10)
          if (Number.isFinite(credits) && credits > 0) {
            await grantPurchasedCredits({
              supabase,
              userId,
              credits,
              reasonCode: 'stripe_topup_grant',
              reasonRef: `stripe_checkout:${session.id}`,
              idempotencyKey: `stripe_checkout:${session.id}`,
              stripeCheckoutSessionId: session.id,
              metadata: {
                pack_id: meta?.packId ?? null,
                stripe_payment_status: session.payment_status ?? null,
              },
            })
          }
          break
        }
        const rawPlan = meta?.productId
        const planId = normalizePlanId(rawPlan)
        const tierMeta = metaPatch(meta)

        if (userId && customerId) {
          await upsertSubscriptionByUserId(supabase, userId, {
            stripe_customer_id: customerId,
            ...(planId ? { plan_id: planId } : {}),
            ...(tierMeta.billing_variant != null ? { billing_variant: tierMeta.billing_variant } : {}),
            ...(tierMeta.revenue_tier != null ? { revenue_tier: tierMeta.revenue_tier } : {}),
            ...(tierMeta.revenue_band_label != null ? { revenue_band_label: tierMeta.revenue_band_label } : {}),
            ...(tierMeta.billing_seats != null ? { billing_seats: tierMeta.billing_seats } : {}),
            ...(tierMeta.billing_variant === 'single' && tierMeta.billing_focus_platforms != null
              ? {
                  billing_focus_platforms: tierMeta.billing_focus_platforms,
                  billing_focus_platform: tierMeta.billing_focus_platform,
                }
              : tierMeta.billing_variant === 'multi'
                ? { billing_focus_platforms: null, billing_focus_platform: null }
                : {}),
          })
          if (planId) await notifyPlanChange(supabase, userId, planId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const rawPlan = sub.metadata?.productId
        const planId = normalizePlanId(rawPlan)
        const tierMeta = metaPatch(sub.metadata as Record<string, string>)
        const period = getSubscriptionPeriodSeconds(sub)
        const lineQty = sub.items?.data?.[0]?.quantity
        const resolvedSeats =
          tierMeta.billing_seats != null
            ? tierMeta.billing_seats
            : typeof lineQty === 'number' && lineQty >= 1
              ? Math.min(50, lineQty)
              : undefined

        await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
          stripe_subscription_id: sub.id,
          ...(planId ? { plan_id: planId } : {}),
          ...(tierMeta.billing_variant != null ? { billing_variant: tierMeta.billing_variant } : {}),
          ...(tierMeta.revenue_tier != null ? { revenue_tier: tierMeta.revenue_tier } : {}),
          ...(tierMeta.revenue_band_label != null ? { revenue_band_label: tierMeta.revenue_band_label } : {}),
          ...(resolvedSeats != null ? { billing_seats: resolvedSeats } : {}),
          ...(tierMeta.billing_variant === 'single' && tierMeta.billing_focus_platforms != null
            ? {
                billing_focus_platforms: tierMeta.billing_focus_platforms,
                billing_focus_platform: tierMeta.billing_focus_platform,
              }
            : tierMeta.billing_variant === 'multi'
              ? { billing_focus_platforms: null, billing_focus_platform: null }
              : {}),
          status: sub.status,
          ...(period
            ? {
                current_period_start: new Date(period.start * 1000).toISOString(),
                current_period_end: new Date(period.end * 1000).toISOString(),
              }
            : {}),
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
          stripe_subscription_id: sub.id,
          status: 'canceled',
          cancel_at_period_end: false,
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
            status: 'active',
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
            status: 'past_due',
          })
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    return NextResponse.json({ received: true, error: message }, { status: 200 })
  }
}
