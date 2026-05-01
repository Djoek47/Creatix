/**
 * Entitlement: Divine Voice Manager (OpenAI Realtime + TTS) and premium OpenAI chat models
 * for messaging. Gated to paid add-on, Divine trial SKU, paid plan in Stripe `trialing`, or bypass env.
 */

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isDivineTrialPlanNotLapsed, isPaidPlanId, type SubscriptionLike } from '@/lib/billing/access'

export type SubscriptionRowForPremiumDivine = SubscriptionLike & {
  divine_voice_premium?: boolean | null
}

/**
 * `true` when `divineVoicePremium=1` (or "true") in Stripe metadata.
 */
export function parseDivineVoiceFromStripeMetadata(
  meta: Record<string, string> | null | undefined,
): boolean {
  if (!meta) return false
  const v = meta.divineVoicePremium ?? meta.divine_voice_premium
  if (v === '1' || v === 'true' || v === 'yes') return true
  return false
}

const priceIdSet: Set<string> = (() => {
  const raw = process.env.STRIPE_DIVINE_VOICE_PRICE_IDS || ''
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
})()

/**
 * `true` if any line item's price id is listed in STRIPE_DIVINE_VOICE_PRICE_IDS (comma-separated).
 */
export function subscriptionStripeHasDivineVoicePrice(sub: Stripe.Subscription): boolean {
  if (parseDivineVoiceFromStripeMetadata(sub.metadata as Record<string, string> | undefined)) {
    return true
  }
  if (priceIdSet.size === 0) return false
  for (const line of sub.items.data) {
    const id = line.price && typeof line.price === 'object' && 'id' in line.price ? line.price.id : null
    if (id && priceIdSet.has(id)) return true
  }
  return false
}

/**
 * If `1` / `true`, grant Divine Voice to every user who already has a paid plan (emergency / beta only).
 */
function envGrantAllPaid(): boolean {
  return process.env.DIVINE_VOICE_GRANT_ALL_PAID === '1' || process.env.DIVINE_VOICE_GRANT_ALL_PAID === 'true'
}

/**
 * The user may use Realtime, TTS, and premium chat models (add-on, Divine trial SKU, or paid plan in Stripe `trialing`).
 */
export function hasDivineVoicePremium(row: SubscriptionRowForPremiumDivine | null | undefined): boolean {
  if (!row) return false
  if (envGrantAllPaid() && isPaidPlanId(row.plan_id) && isActiveLike(row)) {
    return true
  }
  // Match main-app trial nav: `trialing`/`active` plus transitional `trial` / checkout rows (not canceled…).
  if (isDivineTrialPlanNotLapsed(row)) return true

  const st = (row.status || '').toLowerCase()
  // Pro / legacy paid SKU in Stripe billing trial — same voice access as Divine trial during `trialing`.
  if (st === 'trialing' && isPaidPlanId(row.plan_id)) return true

  if (st !== 'active' && st !== 'trialing') return false
  if (!isPaidPlanId(row.plan_id)) return false
  return row.divine_voice_premium === true
}

function isActiveLike(row: { status?: string | null }): boolean {
  const s = (row.status || '').toLowerCase()
  return s === 'active' || s === 'trialing'
}

/** Server-side: resolve whether user can use premium messaging models (same flag as voice). */
export async function getDivineVoicePremiumForUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_id,status,divine_voice_premium')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return hasDivineVoicePremium(
    data as { plan_id?: string | null; status?: string | null; divine_voice_premium?: boolean | null },
  )
}
