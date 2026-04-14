import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  effectiveMonthlyCreditLimit,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'

const SUBSCRIPTION_CREDIT_FIELDS =
  'plan_id, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats, ai_credits_used, ai_credits_limit'

function limitFromSubscriptionRow(
  sub: SubscriptionRowForCredits & { ai_credits_limit?: number | null },
): number {
  return effectiveMonthlyCreditLimit(sub)
}

export type ConsumeAiCreditsResult =
  | { ok: true; usedAfter: number; limit: number }
  | { ok: false; error: 'insufficient_credits'; used: number; limit: number }

export async function consumeAiCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
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

  const row = sub as (SubscriptionRowForCredits & { ai_credits_used?: number | null }) | null
  const used = Number(row?.ai_credits_used ?? 0)
  const limit = row ? limitFromSubscriptionRow(row) : 100

  if (used + amount > limit) {
    return { ok: false, error: 'insufficient_credits', used, limit }
  }

  const { error: upErr } = await supabase
    .from('subscriptions')
    .update({ ai_credits_used: used + amount })
    .eq('user_id', userId)

  if (upErr) {
    return { ok: false, error: 'insufficient_credits', used, limit }
  }

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

  const { data: sub } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_CREDIT_FIELDS)
    .eq('user_id', userId)
    .maybeSingle()

  const row = sub as (SubscriptionRowForCredits & { ai_credits_used?: number | null }) | null
  const used = Number(row?.ai_credits_used ?? 0)
  const limit = row ? limitFromSubscriptionRow(row) : 100

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
