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
import {
  FREE_PLAN_ID,
  isPaidPlanId,
  isProtectionPlanId,
  PAID_PLAN_ID,
  TRIAL_PLAN_ID,
} from '@/lib/billing/access'
import { getSubscriptionPeriodSeconds } from '@/lib/billing/stripe-subscription'
import { ADULT_BILLING_PLATFORMS, parseFocusPlatformsFromComma } from '@/lib/billing/platform-variant'
import { grantPurchasedCredits, reconcileIncludedCreditsWallet } from '@/lib/billing/credit-wallet'
import { creditAutoTopupMaxFailures } from '@/lib/billing/credit-auto-topup'
import { checkoutProductDescriptionForLocale, checkoutProductNameForLocale } from '@/lib/billing/checkout-product-intl'
import { resolveCheckoutLocaleForUser } from '@/lib/i18n/resolve-checkout-locale'
import { getMonthlyPriceCents } from '@/lib/pricing-matrix'
import {
  parseDivineVoiceFromStripeMetadata,
  subscriptionStripeHasDivineVoicePrice,
} from '@/lib/billing/premium-divine'
import { stripeProductForInlinePriceData } from '@/lib/billing/stripe-dahlia-product'
import {
  fetchAuthUserEmail,
  runAdultPartnerPlatformAlignmentForUser,
} from '@/lib/billing/run-adult-partner-platform-alignment'

/** Only touch DB column when checkout metadata explicitly includes divineVoicePremium (avoids wiping on unrelated checkouts). */
function divineVoicePatchFromCheckoutMeta(meta: Record<string, string> | undefined) {
  if (!meta || !Object.prototype.hasOwnProperty.call(meta, 'divineVoicePremium')) {
    return {}
  }
  return { divine_voice_premium: parseDivineVoiceFromStripeMetadata(meta) }
}

/** Node runtime keeps raw webhook bodies predictable (Stripe HMAC matches exact payload bytes). */
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TRIAL_DURATION_DAYS = 2

function stripeWebhookSecret(): string | undefined {
  const raw = process.env.STRIPE_WEBHOOK_SECRET
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined
}

function normalizePlanId(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return isPaidPlanId(raw) ? PAID_PLAN_ID : raw
}

/** Maps Stripe subscription state → our `plan_id` and `trial_ends_at` (clears trial when sub is no longer trialing). */
function resolvedMainPlanAndTrialEnd(sub: Stripe.Subscription): {
  planId: string
  trialEndsAt: string | null
} {
  const rawPlan = sub.metadata?.productId
  const cardRequiredTrial = sub.metadata?.trialSource === 'card_required'
  const st = sub.status

  const trialEndIso =
    typeof sub.trial_end === 'number' ? new Date(sub.trial_end * 1000).toISOString() : null

  if (st === 'trialing') {
    const planId = cardRequiredTrial ? TRIAL_PLAN_ID : normalizePlanId(rawPlan) ?? PAID_PLAN_ID
    return { planId, trialEndsAt: trialEndIso }
  }

  if (st === 'active' || st === 'past_due' || st === 'paused') {
    return {
      planId: normalizePlanId(rawPlan) ?? PAID_PLAN_ID,
      trialEndsAt: null,
    }
  }

  if (
    st === 'canceled' ||
    st === 'unpaid' ||
    st === 'incomplete_expired' ||
    st === 'incomplete'
  ) {
    return { planId: FREE_PLAN_ID, trialEndsAt: null }
  }

  return { planId: FREE_PLAN_ID, trialEndsAt: null }
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
  } else if (billingVariant === 'multi') {
    const raw =
      typeof meta.focusPlatforms === 'string'
        ? meta.focusPlatforms.toLowerCase().trim()
        : typeof meta.focusPlatform === 'string'
          ? meta.focusPlatform.toLowerCase().trim()
          : ''
    if (raw === 'manyvids' || raw.split(',').some((s) => s.trim() === 'manyvids')) {
      billing_focus_platforms = ['manyvids']
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
      'plan_id,billing_variant,revenue_tier,billing_focus_platform,billing_focus_platforms,billing_seats,divine_voice_premium',
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
    divine_voice_premium?: boolean | null
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

  try {
    await reconcileIncludedCreditsWallet(supabase, userId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[stripe webhook] reconcileIncludedCreditsWallet', userId, msg)
  }

  try {
    const email = await fetchAuthUserEmail(supabase, userId)
    await runAdultPartnerPlatformAlignmentForUser(supabase, userId, email)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[stripe webhook] adult partner platform alignment', userId, msg)
  }
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

/** Protection is a second Stripe subscription — never mix into main `plan_id` / `status` period fields. */
async function patchProtectionSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  stripeCustomerId: string,
  sub: Stripe.Subscription,
) {
  const { data: existingRow } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()
  const userId = (existingRow as { user_id?: string } | null)?.user_id
  if (!userId) return
  const active = ['active', 'trialing', 'past_due'].includes(sub.status)
  await supabase
    .from('subscriptions')
    .update({
      protection_stripe_subscription_id: sub.id,
      protection_plan_active: active,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
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
  const webhookSecret = stripeWebhookSecret()
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  // Buffer preserves the exact POST bytes Stripe signed; avoid any UTF-8 re-encoding edge cases vs .text().
  const rawBody = Buffer.from(await req.arrayBuffer())
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
        const isTrialSetup = meta?.type === 'trial_setup'
        const isCreditTopup = meta?.type === 'credit_topup'
        if (isTrialSetup && userId && customerId) {
          const { data: existingSubRow } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', userId)
            .maybeSingle()
          const existingTrial = existingSubRow as { stripe_subscription_id?: string | null } | null
          /** One card-required trial per account: any past or present main Stripe sub blocks another trial_setup. */
          if (existingTrial?.stripe_subscription_id) {
            await upsertSubscriptionByUserId(supabase, userId, {
              stripe_customer_id: customerId,
            })
            break
          }

          const setupIntentId =
            typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
          if (!setupIntentId) break

          const setupIntent = await getStripe().setupIntents.retrieve(setupIntentId)
          const paymentMethodId =
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id
          if (!paymentMethodId) break

          const conversionVariant = meta?.trialConversionVariant === 'multi' ? 'multi' : 'single'
          const conversionTierRaw = Number.parseInt(meta?.trialConversionTier ?? '0', 10)
          const conversionTier =
            Number.isFinite(conversionTierRaw) && conversionTierRaw >= 0 && conversionTierRaw <= 10
              ? conversionTierRaw
              : 0
          const conversionFocusPlatforms =
            conversionVariant === 'single'
              ? parseFocusPlatformsFromComma(meta?.trialConversionFocusPlatforms ?? 'onlyfans') ?? ['onlyfans']
              : null
          const conversionSeatsRaw = Number.parseInt(meta?.trialConversionSeats ?? '1', 10)
          const conversionSeats =
            Number.isFinite(conversionSeatsRaw) && conversionSeatsRaw >= 1
              ? Math.min(50, conversionSeatsRaw)
              : 1

          const paidMeta = {
            productId: meta?.trialConversionPlanId || PAID_PLAN_ID,
            billingVariant: conversionVariant,
            revenueTier: String(conversionTier),
            revenueBandLabel: '',
            focusPlatforms:
              conversionVariant === 'single' ? (conversionFocusPlatforms ?? ['onlyfans']).join(',') : '',
            focusPlatform:
              conversionVariant === 'single'
                ? meta?.trialConversionFocusPlatform || conversionFocusPlatforms?.[0] || 'onlyfans'
                : '',
            seats: String(conversionSeats),
            trialSource: meta?.trialSource || 'card_required',
          }

          const checkoutLocale = await resolveCheckoutLocaleForUser(supabase, userId)
          const focusForProduct =
            conversionVariant === 'single' ? conversionFocusPlatforms ?? ['onlyfans'] : undefined
          const productTitle = await checkoutProductNameForLocale(
            checkoutLocale,
            conversionVariant,
            conversionTier,
            focusForProduct,
          )
          const productDescription = await checkoutProductDescriptionForLocale(
            checkoutLocale,
            conversionVariant,
            conversionTier,
            focusForProduct,
          )
          const stripeProduct = await stripeProductForInlinePriceData({
            name: productTitle,
            description: productDescription,
            metadata: { creatixTrialSetup: session.id.slice(0, 40) },
            idempotencyKey: `trial_prod:${session.id}`,
          })

          const trialItem: Stripe.SubscriptionCreateParams.Item = {
            price_data: {
              currency: 'usd',
              product: stripeProduct.id,
              unit_amount: getMonthlyPriceCents(
                conversionVariant,
                conversionTier,
                conversionVariant === 'single' ? conversionFocusPlatforms ?? ['onlyfans'] : undefined,
              ),
              recurring: { interval: 'month' },
            },
            quantity: conversionSeats,
          }

          const createdSub = await getStripe().subscriptions.create(
            {
              customer: customerId,
              default_payment_method: paymentMethodId,
              trial_period_days: TRIAL_DURATION_DAYS,
              items: [trialItem],
              metadata: paidMeta,
            },
            { idempotencyKey: `trial_setup:${session.id}` },
          )

          const period = getSubscriptionPeriodSeconds(createdSub)
          const trialEndIso =
            typeof createdSub.trial_end === 'number'
              ? new Date(createdSub.trial_end * 1000).toISOString()
              : period
                ? new Date(period.end * 1000).toISOString()
                : undefined
          await upsertSubscriptionByUserId(supabase, userId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: createdSub.id,
            plan_id: 'divine-trial',
            status: createdSub.status,
            trial_expiry_reminder_sent_at: null,
            ...(period && trialEndIso
              ? {
                  current_period_start: new Date(period.start * 1000).toISOString(),
                  current_period_end: new Date(period.end * 1000).toISOString(),
                  trial_ends_at: trialEndIso,
                }
              : trialEndIso
                ? { trial_ends_at: trialEndIso }
                : {}),
            cancel_at_period_end: createdSub.cancel_at_period_end,
          })
          break
        }
        if (isCreditTopup && userId && session.mode === 'payment' && session.payment_status === 'paid') {
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
        if (userId && customerId && rawPlan && isProtectionPlanId(rawPlan)) {
          const subRef = session.subscription
          const subId =
            typeof subRef === 'string' ? subRef : (subRef as Stripe.Subscription | null)?.id ?? null
          await upsertSubscriptionByUserId(supabase, userId, {
            stripe_customer_id: customerId,
            protection_stripe_subscription_id: subId,
            protection_plan_active: true,
          })
          break
        }
        const planId = normalizePlanId(rawPlan)
        const tierMeta = metaPatch(meta)
        const trialEndsAt =
          planId === 'divine-trial'
            ? new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
            : null

        if (userId && customerId) {
          await upsertSubscriptionByUserId(supabase, userId, {
            stripe_customer_id: customerId,
            ...(planId ? { plan_id: planId } : {}),
            ...(trialEndsAt
              ? {
                  status: 'trialing',
                  trial_ends_at: trialEndsAt,
                  current_period_start: new Date().toISOString(),
                  current_period_end: trialEndsAt,
                  cancel_at_period_end: false,
                }
              : {}),
            ...divineVoicePatchFromCheckoutMeta(meta),
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
                ? {
                    billing_focus_platforms: tierMeta.billing_focus_platforms,
                    billing_focus_platform: tierMeta.billing_focus_platform,
                  }
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
        if (isProtectionPlanId(rawPlan)) {
          await patchProtectionSubscription(supabase, customerId, sub)
          break
        }
        const { planId, trialEndsAt } = resolvedMainPlanAndTrialEnd(sub)
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
          divine_voice_premium: subscriptionStripeHasDivineVoicePrice(sub),
          plan_id: planId,
          trial_ends_at: trialEndsAt,
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
              ? {
                  billing_focus_platforms: tierMeta.billing_focus_platforms,
                  billing_focus_platform: tierMeta.billing_focus_platform,
                }
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
        const { data: row } = await supabase
          .from('subscriptions')
          .select('user_id, stripe_subscription_id, protection_stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        const st = row as {
          user_id: string
          stripe_subscription_id: string | null
          protection_stripe_subscription_id: string | null
        } | null
        if (st?.user_id) {
          if (
            isProtectionPlanId(sub.metadata?.productId) ||
            st.protection_stripe_subscription_id === sub.id
          ) {
            await supabase
              .from('subscriptions')
              .update({
                protection_stripe_subscription_id: null,
                protection_plan_active: false,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', st.user_id)
            break
          }
        }
        if (st?.user_id && st.stripe_subscription_id === sub.id) {
          await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
            stripe_subscription_id: sub.id,
            status: 'canceled',
            plan_id: FREE_PLAN_ID,
            trial_ends_at: null,
            cancel_at_period_end: false,
          })
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await upsertSubscriptionByStripeCustomerId(supabase, customerId, {
            status: 'active',
            trial_ends_at: null,
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

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        if (pi.metadata?.type !== 'credit_topup_auto') break
        const userId = pi.metadata?.userId
        if (!userId) break
        const credits = Number.parseInt(pi.metadata?.credits ?? '0', 10)
        if (!Number.isFinite(credits) || credits <= 0) break

        await grantPurchasedCredits({
          supabase,
          userId,
          credits,
          reasonCode: 'stripe_auto_topup_grant',
          reasonRef: pi.id,
          idempotencyKey: `stripe_pi:${pi.id}`,
          metadata: {
            pack_id: pi.metadata?.packId ?? null,
            payment_intent_id: pi.id,
            auto_topup: true,
          },
        })

        const amountUsdCents = typeof pi.amount === 'number' ? pi.amount : Number(pi.amount)
        const { error: evErr } = await supabase.from('credit_auto_topup_events').insert({
          user_id: userId,
          kind: 'success',
          payment_intent_id: pi.id,
          amount_usd_cents: amountUsdCents,
          credits,
          pack_id: pi.metadata?.packId ?? null,
        })

        const pgDup = (evErr as { code?: string } | null)?.code === '23505'
        if (pgDup) break
        if (evErr) {
          console.warn('[stripe webhook] credit_auto_topup_events success insert', evErr.message)
          break
        }

        const { data: settingsRow } = await supabase
          .from('credit_auto_topup_settings')
          .select('monthly_spent_usd_cents')
          .eq('user_id', userId)
          .maybeSingle()

        if (settingsRow) {
          const spent = Number(settingsRow.monthly_spent_usd_cents ?? 0)
          await supabase
            .from('credit_auto_topup_settings')
            .update({
              last_success_at: new Date().toISOString(),
              consecutive_failures: 0,
              last_error: null,
              status: 'active',
              monthly_spent_usd_cents: spent + amountUsdCents,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
        }

        await insertDivineAppNotification(supabase as NotificationInsertClient, userId, {
          type: 'system',
          title: 'Credits added (auto top-up)',
          description: `We added ${credits.toLocaleString()} credits from your saved card.`,
          link: '/dashboard/settings?tab=usage',
          metadata: { kind: 'billing', credit_auto_topup: true },
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        if (pi.metadata?.type !== 'credit_topup_auto') break
        const userId = pi.metadata?.userId
        if (!userId) break

        const msg = pi.last_payment_error?.message ?? 'Payment failed'
        const amountUsdCents = typeof pi.amount === 'number' ? pi.amount : Number(pi.amount)

        const { error: evErr } = await supabase.from('credit_auto_topup_events').insert({
          user_id: userId,
          kind: 'failure',
          payment_intent_id: pi.id,
          amount_usd_cents: Number.isFinite(amountUsdCents) ? amountUsdCents : null,
          pack_id: pi.metadata?.packId ?? null,
          error_message: msg.slice(0, 500),
        })

        const pgDup = (evErr as { code?: string } | null)?.code === '23505'
        if (pgDup) break
        if (evErr) {
          console.warn('[stripe webhook] credit_auto_topup_events failure insert', evErr.message)
          break
        }

        const { data: cur } = await supabase
          .from('credit_auto_topup_settings')
          .select('consecutive_failures, enabled')
          .eq('user_id', userId)
          .maybeSingle()

        const prevF = Number(cur?.consecutive_failures ?? 0)
        const nextF = prevF + 1
        const maxF = creditAutoTopupMaxFailures()
        const pause = cur?.enabled === true && nextF >= maxF

        await supabase
          .from('credit_auto_topup_settings')
          .update({
            consecutive_failures: nextF,
            last_error: msg.slice(0, 500),
            status: pause ? 'paused' : 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        await insertDivineAppNotification(supabase as NotificationInsertClient, userId, {
          type: 'system',
          title: pause ? 'Auto top-up paused' : 'Auto top-up payment failed',
          description: pause
            ? `After ${maxF} failed charges, automatic top-up is paused. Update your card under Billing, then turn auto top-up back on in Usage.`
            : `${msg} We will try again when your balance is low (after the cooldown you set).`,
          link: '/dashboard/settings?tab=usage',
          metadata: { kind: 'billing', credit_auto_topup: true },
        })
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    /** 5xx so Stripe retries; 200 + error in body looks "success" in the Dashboard but never applies business logic. */
    console.error('[stripe webhook]', message, err)
    return NextResponse.json({ received: false, error: message }, { status: 500 })
  }
}
