/**
 * In-app AI credit economics: monthly allowance for paid plans, per-tool debits, and USD mapping.
 * Paid allowance = floor((monthly subscription USD × seats × 0.2) / CREDIT_USD_VALUE) — 20% of subscription as credits.
 */

import { ALL_TOOLS_META } from '@/lib/ai-tools-data'
import { isPaidPlanId } from '@/lib/billing/access'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { getMonthlyPriceUsd, TIER_COUNT, type BillingVariant } from '@/lib/pricing-matrix'
import { getPlanLimits } from '@/lib/billing/plan-limits'

export const CREDIT_USD_VALUE = 0.01

/** Trial / non-paid plans: fixed monthly cap (also used when plan is unknown). */
export const TRIAL_AI_CREDITS_LIMIT = 100

/** Old rows stored “unlimited” as a huge integer; treat as missing so we recompute from subscription USD. */
const LEGACY_UNLIMITED_CREDITS_THRESHOLD = 999000

/** Product-level overrides (per message / run), not necessarily equal to ALL_TOOLS_META.credits for legacy rows. */
export const CREDITS_DIVINE_CHAT_MESSAGE = 5
export const CREDITS_DMCA_CLAIM = 10
export const CREDITS_LEAK_SCAN = 10

const CREDIT_OVERRIDES_BY_TOOL_ID: Record<string, number> = {
  'leak-scanner': CREDITS_LEAK_SCAN,
  /** Circe / Venus / flirt / message-suggestions — one “chat message” debit per request. */
  'divine-chat': CREDITS_DIVINE_CHAT_MESSAGE,
  'mass-dm-composer': 2,
  'creator-mood-pulse': 1,
  'revenue-optimizer': 1,
}

export type SubscriptionRowForCredits = {
  plan_id?: string | null
  billing_variant?: string | null
  revenue_tier?: number | null
  billing_focus_platform?: string | null
  billing_focus_platforms?: string[] | null
  billing_seats?: number | null
}

/**
 * Monthly included credits for the current subscription row.
 * Paid: 20% of monthly USD (after seats) at CREDIT_USD_VALUE per credit.
 * Otherwise: trial cap.
 */
export function computeMonthlyCreditAllowance(row: SubscriptionRowForCredits): number {
  const planId = String(row.plan_id ?? '')
  if (!isPaidPlanId(planId)) {
    return TRIAL_AI_CREDITS_LIMIT
  }

  const variant: BillingVariant = row.billing_variant === 'multi' ? 'multi' : 'single'
  const rawTier = row.revenue_tier ?? 0
  const tierIndex = Math.max(0, Math.min(TIER_COUNT - 1, Math.floor(rawTier)))

  const fps =
    row.billing_focus_platforms && row.billing_focus_platforms.length > 0
      ? (row.billing_focus_platforms as AdultBillingPlatform[])
      : row.billing_focus_platform
        ? ([row.billing_focus_platform] as AdultBillingPlatform[])
        : undefined

  const monthlyUsd = getMonthlyPriceUsd(variant, tierIndex, fps)
  const seats = Math.max(1, Math.floor(row.billing_seats ?? 1))
  const totalUsd = monthlyUsd * seats
  return Math.floor((totalUsd * 0.2) / CREDIT_USD_VALUE)
}

/**
 * Monthly cap for UI and server-side gating. Always applies the 20% rule for paid plans and ignores
 * legacy DB values (e.g. 999999) until Stripe/webhook rows are rewritten.
 */
export function effectiveMonthlyCreditLimit(
  row: SubscriptionRowForCredits & { ai_credits_limit?: number | null },
): number {
  const computed = computeMonthlyCreditAllowance(row)
  const planId = String(row.plan_id ?? '')
  const raw = Number(row.ai_credits_limit ?? NaN)

  if (!isPaidPlanId(planId)) {
    if (Number.isFinite(raw) && raw > 0 && raw < LEGACY_UNLIMITED_CREDITS_THRESHOLD) {
      return Math.min(Math.floor(raw), TRIAL_AI_CREDITS_LIMIT)
    }
    return TRIAL_AI_CREDITS_LIMIT
  }

  return Math.max(0, computed)
}

/** Storage + AI limit for a merged subscription row (Stripe upsert / webhook). */
export function subscriptionFinancialFieldsFromMerged(
  merged: SubscriptionRowForCredits,
): { storage_limit_mb: number; ai_credits_limit: number } {
  const planKey = merged.plan_id && String(merged.plan_id).length > 0 ? String(merged.plan_id) : 'divine-trial'
  const { storage_limit_mb } = getPlanLimits(planKey)
  return {
    storage_limit_mb,
    ai_credits_limit: computeMonthlyCreditAllowance(merged),
  }
}

/**
 * Credits to debit for a library tool id. Uses overrides, then ALL_TOOLS_META.credits, then 1.
 */
export function getCreditsForToolId(toolId: string): number {
  const o = CREDIT_OVERRIDES_BY_TOOL_ID[toolId]
  if (typeof o === 'number' && o >= 0) return o
  const meta = ALL_TOOLS_META.find((t) => t.id === toolId)
  const c = meta?.credits
  if (typeof c === 'number' && c >= 0) return c
  return 1
}
