'use server'

import { createClient } from '@/lib/supabase/server'
import {
  LEGACY_AI_CREDITS_DB_SENTINEL,
  subscriptionFinancialFieldsFromMerged,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'

/**
 * Rewrites stale `ai_credits_limit` (e.g. old “unlimited” 999999) to the current 20%-of-subscription formula
 * (`computeMonthlyCreditAllowance` / `subscriptionFinancialFieldsFromMerged` — same as Stripe upsert path).
 * Safe to call on Settings load; idempotent when already correct.
 */
export async function syncSubscriptionCreditsFromPlanAction(): Promise<{ ok: boolean; updated: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, updated: false }

  const { data: row, error } = await supabase
    .from('subscriptions')
    .select(
      'plan_id, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats, ai_credits_limit',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) return { ok: !error, updated: false }

  const merged = row as SubscriptionRowForCredits & { ai_credits_limit?: number | null }
  const { ai_credits_limit: computed } = subscriptionFinancialFieldsFromMerged(merged)
  const db = Number(merged.ai_credits_limit ?? NaN)

  const needsFix =
    !Number.isFinite(db) ||
    db >= LEGACY_AI_CREDITS_DB_SENTINEL ||
    db !== computed

  if (!needsFix) return { ok: true, updated: false }

  const { error: upErr } = await supabase
    .from('subscriptions')
    .update({
      ai_credits_limit: computed,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  return { ok: !upErr, updated: !upErr }
}
