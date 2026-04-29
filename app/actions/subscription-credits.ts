'use server'

import { createClient } from '@/lib/supabase/server'
import {
  LEGACY_AI_CREDITS_DB_SENTINEL,
  subscriptionFinancialFieldsFromMerged,
  type SubscriptionRowForCredits,
} from '@/lib/billing/credit-economics'

/**
 * Rewrites stale subscription rows to match current plan economics:
 * - `ai_credits_limit` (e.g. old “unlimited” 999999) → 20%-of-subscription formula
 * - `storage_limit_mb` → enforced Supabase vault per-user quota (same as `VAULT_USER_QUOTA_MB` / product default)
 * Safe to call on Settings load; idempotent when already correct.
 */
export async function syncSubscriptionCreditsFromPlanAction(): Promise<{ ok: boolean; updated: boolean }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, updated: false }

    const { data: row, error } = await supabase
      .from('subscriptions')
      .select(
        'plan_id, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats, ai_credits_limit, storage_limit_mb',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !row) return { ok: !error, updated: false }

    const merged = row as SubscriptionRowForCredits & {
      ai_credits_limit?: number | null
      storage_limit_mb?: number | null
    }
    const { ai_credits_limit: computed, storage_limit_mb: storageTarget } =
      subscriptionFinancialFieldsFromMerged(merged)
    const db = Number(merged.ai_credits_limit ?? NaN)
    const dbStorage = Number(merged.storage_limit_mb ?? NaN)

    const needsCreditFix =
      !Number.isFinite(db) || db >= LEGACY_AI_CREDITS_DB_SENTINEL || db !== computed

    const needsStorageFix =
      !Number.isFinite(dbStorage) || dbStorage !== storageTarget || dbStorage > 1_000_000

    if (!needsCreditFix && !needsStorageFix) return { ok: true, updated: false }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (needsCreditFix) patch.ai_credits_limit = computed
    if (needsStorageFix) patch.storage_limit_mb = storageTarget

    const { error: upErr } = await supabase.from('subscriptions').update(patch).eq('user_id', user.id)

    return { ok: !upErr, updated: !upErr }
  } catch (err) {
    console.error('[syncSubscriptionCreditsFromPlanAction]', err)
    return { ok: false, updated: false }
  }
}
