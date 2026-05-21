import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  effectiveMonthlyCreditLimit,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'
import { consumeFromWallet, getCreditWalletState } from '@/lib/billing/credit-wallet'

const SUBSCRIPTION_CREDIT_FIELDS =
  'plan_id, status, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats, ai_credits_used, ai_credits_limit'

function limitFromSubscriptionRow(
  sub: SubscriptionRowForCredits & { ai_credits_limit?: number | null },
): number {
  return effectiveMonthlyCreditLimit(sub)
}

export type ConsumeAiCreditsResult =
  | { ok: true; usedAfter: number; limit: number }
  | { ok: false; error: 'insufficient_credits'; used: number; limit: number }

type ConsumeOptions = {
  reasonCode?: string
  reasonRef?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export async function consumeAiCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  options?: ConsumeOptions,
): Promise<ConsumeAiCreditsResult> {
  if (amount <= 0) {
    return { ok: true, usedAfter: 0, limit: 0 }
  }

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_CREDIT_FIELDS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { ok: false, error: 'insufficient_credits', used: 0, limit: 0 }
  }

  const row = sub as (SubscriptionRowForCredits & { ai_credits_used?: number | null; status?: string | null }) | null
  const used = Number(row?.ai_credits_used ?? 0)
  const status = String(row?.status ?? '').toLowerCase()
  const limit = row && (status === 'active' || status === 'trialing') ? limitFromSubscriptionRow(row) : 0

  const enforceWallet = process.env.CREDIT_WALLET_ENFORCED !== 'false'
  if (enforceWallet) {
    const reasonCode = options?.reasonCode ?? 'ai_usage'
    const nonce = crypto.randomUUID()
    const reasonRef = options?.reasonRef ?? `ai:${userId}:${nonce}`
    const idempotencyKey = options?.idempotencyKey ?? `${reasonCode}:${reasonRef}:${amount}`
    const wallet = await consumeFromWallet({
      supabase,
      userId,
      amount,
      reasonCode,
      reasonRef,
      idempotencyKey,
      metadata: options?.metadata,
    })
    if (!wallet.ok) {
      const limitForResponse = Math.max(limit, wallet.totalRemaining + used)
      const usedForResponse = Math.max(0, limitForResponse - wallet.totalRemaining)
      return { ok: false, error: 'insufficient_credits', used: usedForResponse, limit: limitForResponse }
    }

    const usedAfter = used + amount
    await supabase
      .from('subscriptions')
      .update({ ai_credits_used: usedAfter })
      .eq('user_id', userId)
    return { ok: true, usedAfter, limit: Math.max(limit, usedAfter) }
  }

  if (used + amount > limit) {
    return { ok: false, error: 'insufficient_credits', used, limit }
  }

  const { error: upErr } = await supabase
    .from('subscriptions')
    .update({ ai_credits_used: used + amount })
    .eq('user_id', userId)

  if (upErr) return { ok: false, error: 'insufficient_credits', used, limit }
  return { ok: true, usedAfter: used + amount, limit }
}

export async function hasEnoughAiCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<ConsumeAiCreditsResult> {
  if (amount <= 0) {
    return { ok: true, usedAfter: 0, limit: 0 }
  }

  const enforceWallet = process.env.CREDIT_WALLET_ENFORCED !== 'false'
  if (enforceWallet) {
    const wallet = await getCreditWalletState(supabase, userId)
    const limit = Math.max(amount, wallet.totalRemaining)
    const used = Math.max(0, limit - wallet.totalRemaining)
    if (wallet.totalRemaining < amount) {
      return { ok: false, error: 'insufficient_credits', used, limit }
    }
    return { ok: true, usedAfter: used, limit }
  }

  const { data: sub } = await supabase.from('subscriptions').select(SUBSCRIPTION_CREDIT_FIELDS).eq('user_id', userId).maybeSingle()

  const row = sub as (SubscriptionRowForCredits & { ai_credits_used?: number | null; status?: string | null }) | null
  const used = Number(row?.ai_credits_used ?? 0)
  const status = String(row?.status ?? '').toLowerCase()
  const limit = row && (status === 'active' || status === 'trialing') ? limitFromSubscriptionRow(row) : 0

  if (used + amount > limit) {
    return { ok: false, error: 'insufficient_credits', used, limit }
  }

  return { ok: true, usedAfter: used, limit }
}

export function insufficientAiCreditsResponse(used: number, limit: number) {
  return NextResponse.json(
    { error: 'Insufficient AI credits', code: 'ai_credits_exhausted', used, limit },
    { status: 402 },
  )
}
