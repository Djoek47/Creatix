import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCreditWalletState } from '@/lib/billing/credit-wallet'
import { getProduct } from '@/lib/products'
import {
  creditAutoTopupCronBatchLimit,
  creditAutoTopupMaxChargesPerUtcDay,
  creditAutoTopupUserAllowlist,
  isCreditAutoTopupDryRun,
  isCreditAutoTopupGloballyEnabled,
  maybeResetMonthlySpendWindow,
  normalizeSettingsRow,
  type CreditAutoTopupSettingsRow,
} from '@/lib/billing/credit-auto-topup'
import {
  createConfirmedAutoTopupPaymentIntent,
  resolveDefaultPaymentMethodId,
} from '@/lib/billing/credit-auto-topup-stripe'

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const globallyOn = isCreditAutoTopupGloballyEnabled()
  const dryRun = isCreditAutoTopupDryRun()
  if (!globallyOn && !dryRun) {
    return NextResponse.json({
      skipped: true,
      reason:
        'CREDIT_AUTO_TOPUP_ENABLED is not true (set CREDIT_AUTO_TOPUP_DRY_RUN=true to simulate without charging)',
    })
  }

  const supabase = createServiceRoleClient()
  const batchLimit = creditAutoTopupCronBatchLimit()
  const allowlist = creditAutoTopupUserAllowlist()

  const { data: rows, error } = await supabase
    .from('credit_auto_topup_settings')
    .select('*')
    .eq('enabled', true)
    .in('status', ['active', 'needs_payment_method'])
    .limit(batchLimit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<Record<string, unknown>> = []
  const dayStart = startOfUtcDay(new Date()).toISOString()

  for (const raw of rows ?? []) {
    let settings = normalizeSettingsRow(raw as CreditAutoTopupSettingsRow)
    const userId = settings.user_id

    if (allowlist && !allowlist.has(userId)) {
      results.push({ userId, skipped: 'not_in_allowlist' })
      continue
    }

    const reset = maybeResetMonthlySpendWindow(settings)
    if (reset.monthly_window_start !== settings.monthly_window_start) {
      await supabase
        .from('credit_auto_topup_settings')
        .update({
          monthly_spent_usd_cents: 0,
          monthly_window_start: reset.monthly_window_start,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      settings = {
        ...settings,
        monthly_spent_usd_cents: 0,
        monthly_window_start: reset.monthly_window_start,
      }
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, stripe_customer_id, protection_plan_active, current_period_end, plan_id')
      .eq('user_id', userId)
      .maybeSingle()

    const st = (sub ?? {}) as {
      status?: string | null
      stripe_customer_id?: string | null
      protection_plan_active?: boolean | null
    }

    const subStatus = String(st.status ?? '').toLowerCase()
    const stripeCustomerId = st.stripe_customer_id
    const eligible =
      !!stripeCustomerId &&
      (subStatus === 'active' || subStatus === 'trialing' || st.protection_plan_active === true)

    if (!eligible) {
      results.push({ userId, skipped: 'not_eligible' })
      continue
    }

    const wallet = await getCreditWalletState(supabase, userId)
    if (wallet.totalRemaining > settings.threshold_credits) {
      results.push({
        userId,
        skipped: 'above_threshold',
        totalRemaining: wallet.totalRemaining,
      })
      continue
    }

    if (settings.last_attempt_at) {
      const last = new Date(settings.last_attempt_at).getTime()
      const coolMs = settings.cooldown_minutes * 60_000
      if (Date.now() - last < coolMs) {
        results.push({ userId, skipped: 'cooldown' })
        continue
      }
    }

    const pack = getProduct(settings.pack_id)
    if (!pack || typeof pack.priceInCents !== 'number' || !pack.credits) {
      results.push({ userId, skipped: 'bad_pack' })
      continue
    }

    if (settings.monthly_spent_usd_cents + pack.priceInCents > settings.monthly_max_usd_cents) {
      results.push({
        userId,
        skipped: 'monthly_cap',
        spent: settings.monthly_spent_usd_cents,
      })
      continue
    }

    const { count: attemptDayCount, error: cntErr } = await supabase
      .from('credit_auto_topup_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kind', 'attempt')
      .gte('created_at', dayStart)

    if (cntErr) {
      results.push({ userId, error: cntErr.message })
      continue
    }

    const maxDay = creditAutoTopupMaxChargesPerUtcDay()
    if ((attemptDayCount ?? 0) >= maxDay) {
      results.push({ userId, skipped: 'daily_attempt_cap' })
      continue
    }

    const pm = await resolveDefaultPaymentMethodId(stripeCustomerId!)
    if (!pm) {
      await supabase
        .from('credit_auto_topup_settings')
        .update({
          status: 'needs_payment_method',
          last_error: 'No default card on file.',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      results.push({ userId, skipped: 'needs_payment_method' })
      continue
    }

    if (settings.status === 'needs_payment_method' && pm) {
      await supabase
        .from('credit_auto_topup_settings')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    const subRow = sub as { current_period_end?: string | null } | null
    const cycleKey = subRow?.current_period_end
      ? new Date(subRow.current_period_end).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 7)

    const idempotencyKey = `auto_topup:${userId}:${settings.pack_id}:${cycleKey}:${Date.now()}`

    console.log(
      JSON.stringify({
        event: 'credit_auto_topup_eval',
        userId,
        dryRun,
        globallyOn,
        totalRemaining: wallet.totalRemaining,
        threshold: settings.threshold_credits,
        packId: settings.pack_id,
        priceCents: pack.priceInCents,
      }),
    )

    if (dryRun || !globallyOn) {
      results.push({
        userId,
        dryRun: true,
        wouldCharge: true,
        packId: settings.pack_id,
        amountCents: pack.priceInCents,
      })
      continue
    }

    await supabase.from('credit_auto_topup_events').insert({
      user_id: userId,
      kind: 'attempt',
      amount_usd_cents: pack.priceInCents,
      credits: pack.credits,
      pack_id: settings.pack_id,
    })

    try {
      const pi = await createConfirmedAutoTopupPaymentIntent({
        stripeCustomerId: stripeCustomerId!,
        userId,
        packId: settings.pack_id,
        credits: pack.credits,
        amountUsdCents: pack.priceInCents,
        idempotencyKey,
      })

      await supabase
        .from('credit_auto_topup_settings')
        .update({
          last_attempt_at: new Date().toISOString(),
          last_payment_intent_id: pi.id,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      results.push({ userId, charged: true, paymentIntentId: pi.id, status: pi.status })
    } catch (e) {
      const err = e as Error & { code?: string; decline_code?: string }
      const msg = err.message ?? 'stripe_error'
      let statusPatch: 'requires_action' | 'active' | 'needs_payment_method' = 'active'
      if (
        err.code === 'authentication_required' ||
        err.code === 'payment_intent_authentication_failure' ||
        err.decline_code === 'authentication_required' ||
        (e instanceof Stripe.errors.StripeCardError && err.decline_code === 'authentication_required')
      ) {
        statusPatch = 'requires_action'
      } else if (
        err.code === 'missing_default_payment_method' ||
        msg === 'missing_default_payment_method'
      ) {
        statusPatch = 'needs_payment_method'
      }

      await supabase
        .from('credit_auto_topup_settings')
        .update({
          last_attempt_at: new Date().toISOString(),
          last_error: msg.slice(0, 500),
          status: statusPatch,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      results.push({ userId, charged: false, error: msg, status: statusPatch })
    }
  }

  return NextResponse.json({
    processed: (rows ?? []).length,
    globallyOn,
    dryRun,
    results,
  })
}
