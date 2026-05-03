import type { SupabaseClient } from '@supabase/supabase-js'
import { isPaidPlanId, isProtectionPlanId, isTrialPlanId } from '@/lib/billing/access'
import {
  effectiveMonthlyCreditLimit,
  TRIAL_AI_CREDITS_LIMIT,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'

type WalletRow = {
  user_id: string
  included_credits_remaining: number
  purchased_credits_remaining: number
  included_cycle_start: string | null
  included_cycle_end: string | null
  banked_trial_credits?: number | null
  included_grant_plan_kind?: string | null
}

type SubscriptionCycleRow = SubscriptionRowForCredits & {
  status?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  ai_credits_limit?: number | null
  ai_credits_used?: number | null
}

export type CreditWalletState = {
  includedRemaining: number
  purchasedRemaining: number
  /** Included + purchased (excludes {@link bankedTrialCredits}). */
  totalRemaining: number
  /** Saved unused trial included credits while on free/ineligible; rolled into included on next paid/protection grant. */
  bankedTrialCredits: number
  includedCycleStart: string | null
  includedCycleEnd: string | null
}

export type ConsumeWalletResult =
  | {
      ok: true
      includedRemaining: number
      purchasedRemaining: number
      totalRemaining: number
      includedSpent: number
      purchasedSpent: number
    }
  | {
      ok: false
      error: 'insufficient_credits' | 'unknown'
      includedRemaining: number
      purchasedRemaining: number
      totalRemaining: number
    }

export function allocateDebitBetweenBuckets(
  includedRemaining: number,
  purchasedRemaining: number,
  amount: number,
): { includedSpent: number; purchasedSpent: number; ok: boolean } {
  const includedSpent = Math.min(Math.max(0, includedRemaining), Math.max(0, amount))
  const purchasedSpent = Math.min(Math.max(0, purchasedRemaining), Math.max(0, amount - includedSpent))
  return {
    includedSpent,
    purchasedSpent,
    ok: includedSpent + purchasedSpent >= amount,
  }
}

function monthBoundsFrom(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  return { start, end }
}

function plusOneMonth(date: Date): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d
}

async function ensureWallet(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.rpc('ensure_credit_wallet', { p_user_id: userId })
}

async function expireWalletCredits(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.rpc('expire_credit_grants_for_user', { p_user_id: userId })
}

async function readWalletRow(supabase: SupabaseClient, userId: string): Promise<WalletRow | null> {
  const { data } = await supabase
    .from('credit_wallets')
    .select(
      'user_id,included_credits_remaining,purchased_credits_remaining,included_cycle_start,included_cycle_end,banked_trial_credits,included_grant_plan_kind',
    )
    .eq('user_id', userId)
    .maybeSingle()

  return (data as WalletRow | null) ?? null
}

async function readSubscriptionCycle(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionCycleRow | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(
      'plan_id,status,billing_variant,revenue_tier,billing_focus_platform,billing_focus_platforms,billing_seats,current_period_start,current_period_end,ai_credits_limit,ai_credits_used',
    )
    .eq('user_id', userId)
    .maybeSingle()

  return (data as SubscriptionCycleRow | null) ?? null
}

function cycleWindow(sub: SubscriptionCycleRow | null): { start: Date; end: Date } {
  if (sub?.current_period_start && sub?.current_period_end) {
    return {
      start: new Date(sub.current_period_start),
      end: new Date(sub.current_period_end),
    }
  }
  return monthBoundsFrom(new Date())
}

/**
 * If Stripe reported billing-window dates but `credit_wallets` still reflects an older cycle
 * (e.g. calendar month with a future end and 0 included credits), `cycleNeedsReset` must run
 * or trialing/active users stay at 0 until the stale cycle ends.
 */
function walletSubscriptionCycleMismatch(
  wallet: WalletRow | null,
  sub: SubscriptionCycleRow | null,
): boolean {
  if (!sub?.current_period_start || !sub?.current_period_end) return false
  const ss = new Date(sub.current_period_start).getTime()
  const se = new Date(sub.current_period_end).getTime()
  if (!wallet?.included_cycle_start || !wallet?.included_cycle_end) return true
  const ws = new Date(wallet.included_cycle_start).getTime()
  const we = new Date(wallet.included_cycle_end).getTime()
  const toleranceMs = 120_000
  return Math.abs(ws - ss) > toleranceMs || Math.abs(we - se) > toleranceMs
}

export function purchasedTopupExpiryFromSubscription(sub: SubscriptionCycleRow | null): Date {
  const { end } = cycleWindow(sub)
  return plusOneMonth(end)
}

async function syncIncludedGrantIfNeeded(supabase: SupabaseClient, userId: string): Promise<void> {
  const [wallet, sub] = await Promise.all([readWalletRow(supabase, userId), readSubscriptionCycle(supabase, userId)])
  const { start, end } = cycleWindow(sub)
  const status = String(sub?.status ?? '').toLowerCase()
  const isCreditEligible = status === 'active' || status === 'trialing'
  const nowMs = Date.now()
  const walletCycleEndMs = wallet?.included_cycle_end ? new Date(wallet.included_cycle_end).getTime() : 0
  const hasIncludedCredits = Number(wallet?.included_credits_remaining ?? 0) > 0
  const cycleNeedsReset =
    !wallet ||
    !wallet.included_cycle_end ||
    walletCycleEndMs <= nowMs ||
    (!isCreditEligible && hasIncludedCredits) ||
    walletSubscriptionCycleMismatch(wallet, sub)

  if (!cycleNeedsReset) return

  const prevIncluded = Math.max(0, Math.floor(Number(wallet?.included_credits_remaining ?? 0)))
  const prevKind = wallet?.included_grant_plan_kind ?? null
  let banked = Math.max(0, Math.floor(Number(wallet?.banked_trial_credits ?? 0)))

  const planId = String(sub?.plan_id ?? '')
  const isTrialAllowance =
    isCreditEligible && sub != null && isTrialPlanId(sub.plan_id) && (status === 'active' || status === 'trialing')
  const isPaidOrProtectionAllowance =
    isCreditEligible &&
    sub != null &&
    (isPaidPlanId(planId) || isProtectionPlanId(planId)) &&
    (status === 'active' || status === 'trialing')

  if (!isCreditEligible) {
    const shouldBankTrialRemainder =
      prevIncluded > 0 &&
      (prevKind === 'trial' ||
        (prevKind == null && prevIncluded > 0 && prevIncluded <= TRIAL_AI_CREDITS_LIMIT))
    if (shouldBankTrialRemainder) {
      banked += prevIncluded
    }

    await supabase.from('credit_wallets').upsert(
      {
        user_id: userId,
        included_credits_remaining: 0,
        banked_trial_credits: banked,
        included_grant_plan_kind: null,
        included_cycle_start: start.toISOString(),
        included_cycle_end: end.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    return
  }

  const limitRaw = sub != null ? effectiveMonthlyCreditLimit(sub) : 0
  const limit = Math.max(0, Math.floor(limitRaw))

  let grantTotal = 0
  let nextKind: 'trial' | 'paid' | 'protection' | null = null
  let bankedAfter = banked
  /** Unused included balance from a trial-shaped pool when upgrading to paid (incl. legacy rows before `included_grant_plan_kind`). */
  const trialLiveRollover =
    prevIncluded > 0 &&
    (prevKind === 'trial' ||
      (prevKind == null && prevIncluded > 0 && prevIncluded <= TRIAL_AI_CREDITS_LIMIT))
      ? prevIncluded
      : 0

  if (isTrialAllowance) {
    grantTotal = limit
    nextKind = 'trial'
  } else if (isPaidOrProtectionAllowance) {
    grantTotal = limit + banked + trialLiveRollover
    bankedAfter = 0
    nextKind = isProtectionPlanId(planId) ? 'protection' : 'paid'
  } else if (limit > 0) {
    grantTotal = limit
    nextKind = 'trial'
  } else {
    await supabase.from('credit_wallets').upsert(
      {
        user_id: userId,
        included_credits_remaining: 0,
        banked_trial_credits: bankedAfter,
        included_grant_plan_kind: null,
        included_cycle_start: start.toISOString(),
        included_cycle_end: end.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    return
  }

  await supabase.from('credit_wallets').upsert(
    {
      user_id: userId,
      included_credits_remaining: 0,
      banked_trial_credits: bankedAfter,
      included_grant_plan_kind: null,
      included_cycle_start: start.toISOString(),
      included_cycle_end: end.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (grantTotal <= 0) return

  const idempotencyKey = `included:${userId}:${start.toISOString().slice(0, 10)}`
  await supabase.rpc('grant_credit_wallet', {
    p_user_id: userId,
    p_source: 'included_monthly',
    p_bucket: 'included',
    p_credits: grantTotal,
    p_expires_at: end.toISOString(),
    p_reason_code: 'monthly_included_grant',
    p_reason_ref: `included:${userId}:${start.toISOString().slice(0, 10)}`,
    p_idempotency_key: idempotencyKey,
    p_metadata: {
      cycle_start: start.toISOString(),
      cycle_end: end.toISOString(),
      included_grant_plan_kind: nextKind,
      trial_bank_applied: banked,
      trial_live_rollover_applied: trialLiveRollover,
    },
  })

  if (nextKind) {
    await supabase
      .from('credit_wallets')
      .update({ included_grant_plan_kind: nextKind, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  }
}

/** Runs the same prelude as billing UI: wallet row exists, expiry applied, cycle matched to subscription grant. */
export async function reconcileIncludedCreditsWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await ensureWallet(supabase, userId)
  await expireWalletCredits(supabase, userId)
  await syncIncludedGrantIfNeeded(supabase, userId)
}

export async function getCreditWalletState(
  supabase: SupabaseClient,
  userId: string,
): Promise<CreditWalletState> {
  await reconcileIncludedCreditsWallet(supabase, userId)
  const wallet = await readWalletRow(supabase, userId)
  const includedRemaining = Number(wallet?.included_credits_remaining ?? 0)
  const purchasedRemaining = Number(wallet?.purchased_credits_remaining ?? 0)
  const bankedTrialCredits = Math.max(0, Math.floor(Number(wallet?.banked_trial_credits ?? 0)))
  return {
    includedRemaining,
    purchasedRemaining,
    totalRemaining: includedRemaining + purchasedRemaining,
    bankedTrialCredits,
    includedCycleStart: wallet?.included_cycle_start ?? null,
    includedCycleEnd: wallet?.included_cycle_end ?? null,
  }
}

export async function grantPurchasedCredits(args: {
  supabase: SupabaseClient
  userId: string
  credits: number
  reasonCode: string
  reasonRef: string
  idempotencyKey: string
  stripeCheckoutSessionId?: string | null
  metadata?: Record<string, unknown>
}): Promise<CreditWalletState> {
  const { supabase, userId, credits, reasonCode, reasonRef, idempotencyKey } = args
  await ensureWallet(supabase, userId)
  await expireWalletCredits(supabase, userId)
  const sub = await readSubscriptionCycle(supabase, userId)
  const expiresAt = purchasedTopupExpiryFromSubscription(sub)

  await supabase.rpc('grant_credit_wallet', {
    p_user_id: userId,
    p_source: 'topup_pack',
    p_bucket: 'purchased',
    p_credits: Math.max(0, Math.floor(credits)),
    p_expires_at: expiresAt.toISOString(),
    p_reason_code: reasonCode,
    p_reason_ref: reasonRef,
    p_idempotency_key: idempotencyKey,
    p_stripe_checkout_session_id: args.stripeCheckoutSessionId ?? null,
    p_metadata: {
      ...(args.metadata ?? {}),
      rollover_policy: 'one_extra_month',
    },
  })

  return getCreditWalletState(supabase, userId)
}

export async function consumeFromWallet(args: {
  supabase: SupabaseClient
  userId: string
  amount: number
  reasonCode: string
  reasonRef: string
  idempotencyKey: string
  metadata?: Record<string, unknown>
}): Promise<ConsumeWalletResult> {
  const { supabase, userId, amount, reasonCode, reasonRef, idempotencyKey } = args
  if (amount <= 0) {
    const state = await getCreditWalletState(supabase, userId)
    return {
      ok: true,
      includedRemaining: state.includedRemaining,
      purchasedRemaining: state.purchasedRemaining,
      totalRemaining: state.totalRemaining,
      includedSpent: 0,
      purchasedSpent: 0,
    }
  }

  await ensureWallet(supabase, userId)
  await expireWalletCredits(supabase, userId)
  await syncIncludedGrantIfNeeded(supabase, userId)

  const { data, error } = await supabase.rpc('debit_credit_wallet', {
    p_user_id: userId,
    p_amount: Math.max(1, Math.floor(amount)),
    p_reason_code: reasonCode,
    p_reason_ref: reasonRef,
    p_idempotency_key: idempotencyKey,
    p_metadata: args.metadata ?? {},
  })

  if (error) {
    const state = await getCreditWalletState(supabase, userId)
    return {
      ok: false,
      error: 'unknown',
      includedRemaining: state.includedRemaining,
      purchasedRemaining: state.purchasedRemaining,
      totalRemaining: state.totalRemaining,
    }
  }

  const row = Array.isArray(data) ? data[0] : data
  const ok = row?.ok === true
  const includedRemaining = Number(row?.included_remaining ?? 0)
  const purchasedRemaining = Number(row?.purchased_remaining ?? 0)
  const totalRemaining = Number(row?.total_remaining ?? includedRemaining + purchasedRemaining)

  if (!ok) {
    return {
      ok: false,
      error: row?.error_code === 'insufficient_credits' ? 'insufficient_credits' : 'unknown',
      includedRemaining,
      purchasedRemaining,
      totalRemaining,
    }
  }

  return {
    ok: true,
    includedRemaining,
    purchasedRemaining,
    totalRemaining,
    includedSpent: Number(row?.included_spent ?? 0),
    purchasedSpent: Number(row?.purchased_spent ?? 0),
  }
}
