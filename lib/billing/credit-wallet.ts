import type { SupabaseClient } from '@supabase/supabase-js'
import {
  effectiveMonthlyCreditLimit,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'

type WalletRow = {
  user_id: string
  included_credits_remaining: number
  purchased_credits_remaining: number
  included_cycle_start: string | null
  included_cycle_end: string | null
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
  totalRemaining: number
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
      'user_id,included_credits_remaining,purchased_credits_remaining,included_cycle_start,included_cycle_end',
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
    !wallet || !wallet.included_cycle_end || walletCycleEndMs <= nowMs || (!isCreditEligible && hasIncludedCredits)

  if (!cycleNeedsReset) return

  const limit =
    !isCreditEligible ? 0 : sub != null ? effectiveMonthlyCreditLimit(sub) : 0

  await supabase
    .from('credit_wallets')
    .upsert(
      {
        user_id: userId,
        included_credits_remaining: 0,
        included_cycle_start: start.toISOString(),
        included_cycle_end: end.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (limit <= 0) return

  await supabase.rpc('grant_credit_wallet', {
    p_user_id: userId,
    p_source: 'included_monthly',
    p_bucket: 'included',
    p_credits: Math.max(0, Math.floor(limit)),
    p_expires_at: end.toISOString(),
    p_reason_code: 'monthly_included_grant',
    p_reason_ref: `included:${userId}:${start.toISOString().slice(0, 10)}`,
    p_idempotency_key: `included:${userId}:${start.toISOString().slice(0, 10)}`,
    p_metadata: {
      cycle_start: start.toISOString(),
      cycle_end: end.toISOString(),
    },
  })
}

export async function getCreditWalletState(
  supabase: SupabaseClient,
  userId: string,
): Promise<CreditWalletState> {
  await ensureWallet(supabase, userId)
  await expireWalletCredits(supabase, userId)
  await syncIncludedGrantIfNeeded(supabase, userId)
  const wallet = await readWalletRow(supabase, userId)
  const includedRemaining = Number(wallet?.included_credits_remaining ?? 0)
  const purchasedRemaining = Number(wallet?.purchased_credits_remaining ?? 0)
  return {
    includedRemaining,
    purchasedRemaining,
    totalRemaining: includedRemaining + purchasedRemaining,
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
