/**
 * In-app AI credit economics: monthly allowance for paid plans, per-tool debits, and USD mapping.
 *
 * **Monthly pool (paid):** 20% of subscription USD (× seats) converted at `CREDIT_USD_VALUE`.
 * Example: $100/mo → $20 → 20 / 0.01 = **2 000 credits** ($1 = 100 credits).
 *
 * **Per use:** Debits approximate our blended provider COGS (OpenAI / Anthropic / Grok / Serper, etc.); tune
 * `PROVIDER_USD_ESTIMATE` from real invoices. `creditsForProviderUsdEstimate` = ceil(usd / CREDIT_USD_VALUE), min 1.
 */

import { ALL_TOOLS_META, resolveCanonicalToolId } from '@/lib/ai-tools-data'
import { isPaidPlanId, isProtectionPlanId } from '@/lib/billing/access'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { getMonthlyPriceUsd, TIER_COUNT, type BillingVariant } from '@/lib/pricing-matrix'
import { getPlanLimits } from '@/lib/billing/plan-limits'

export const CREDIT_USD_VALUE = 0.01

/** Minimum USD for one-time custom credit top-up (Stripe checkout). Preset packs may be lower. */
export const CUSTOM_CREDIT_TOPUP_MIN_USD = 5

/** Default USD shown in the custom top-up field (user may lower to the minimum). */
export const CUSTOM_CREDIT_TOPUP_DEFAULT_USD = 25

/** Included credits per $1 of monthly subscription (20% back at $0.01 per credit). */
export const CREDITS_PER_SUBSCRIPTION_USD = 20

/** Trial / non-paid plans: fixed monthly cap (also used when plan is unknown). Matches DB default in `079_trial_policy_2_days_250_credits.sql`. */
export const TRIAL_AI_CREDITS_LIMIT = 100

/** $25/mo Protection (`cev-protection`): fixed monthly AI pool (not 20% of $25). */
export const PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS = 800

/** Old DB rows used a huge sentinel for “unlimited”; sync + UI ignore these. */
export const LEGACY_AI_CREDITS_DB_SENTINEL = 999000

const LEGACY_UNLIMITED_CREDITS_THRESHOLD = LEGACY_AI_CREDITS_DB_SENTINEL

/** Rough blended COGS (USD) per action — adjust from provider invoices. */
export const PROVIDER_USD_ESTIMATE = {
  /** Typical gpt-4o-mini style chat turn */
  chatMiniTurn: 0.0015,
  /** Richer chat / small tool (more tokens) */
  toolLight: 0.012,
  toolMedium: 0.035,
  toolHeavy: 0.1,
  /** Full leak scan: many Serper calls + Grok enrichment */
  serperLeakScanRun: 0.42,
  /** Reputation wide+social Serper batch */
  serperReputationRun: 0.48,
  dmcaClaimPrep: 0.07,
  /** Frame AI assist (gpt-4o-mini class) */
  frameAiAssistTurn: 0.012,
  /** Ariadne append-v1 embed (download + upload + crypto) */
  ariadneEmbed: 0.08,
  /** Ariadne leak-file detection parse */
  ariadneDetect: 0.04,
} as const

/** Credits to debit ≈ provider USD / CREDIT_USD_VALUE (integer, ≥ 1, capped for sanity). */
export function creditsForProviderUsdEstimate(providerUsd: number): number {
  if (!Number.isFinite(providerUsd) || providerUsd <= 0) return 1
  const n = Math.ceil(providerUsd / CREDIT_USD_VALUE)
  return Math.min(50_000, Math.max(1, n))
}

/** Product-level overrides (routes + Divine tools). Aligned to PROVIDER_USD_ESTIMATE. */
export const CREDITS_DIVINE_CHAT_MESSAGE = creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.chatMiniTurn)
export const CREDITS_MESSAGE_GENERATION_LIGHT = 1

/** Divine Manager text chat: included turns per billing period before wallet debits (same pool as `claim_divine_manager_text_bundle`). Not shown in product copy. */
export const DIVINE_MANAGER_TEXT_CHAT_INCLUDED_PER_PERIOD = 100

/**
 * Premium Divine realtime voice (beta): **50 credits per wall-clock minute** while live.
 * Telemetry debits from whole seconds via {@link divineVoiceCreditsForWholeSeconds}; keep UI in sync.
 */
export const DIVINE_VOICE_CREDITS_PER_MINUTE = 50

/** Two-decimal credits/sec for display (50 ÷ 60). */
export function formatDivineVoiceCreditsPerSecond(): string {
  return (DIVINE_VOICE_CREDITS_PER_MINUTE / 60).toFixed(2)
}

export function divineVoiceCreditsPerMinute(): number {
  return DIVINE_VOICE_CREDITS_PER_MINUTE
}

/** Bill whole seconds of live voice at the per-minute rate (ceil). */
export function divineVoiceCreditsForWholeSeconds(wholeSeconds: number): number {
  const s = Math.max(0, Math.floor(wholeSeconds))
  if (s <= 0) return 0
  return Math.ceil((s * DIVINE_VOICE_CREDITS_PER_MINUTE) / 60)
}

/** Wallet-equivalent USD per minute at {@link CREDIT_USD_VALUE} (informational). */
export function divineVoiceWalletUsdPerMinute(): number {
  return divineVoiceCreditsPerMinute() * CREDIT_USD_VALUE
}

export function formatUsdWalletApprox(usd: number): string {
  if (!Number.isFinite(usd)) return '—'
  return `~$${usd.toFixed(2)}`
}

/** Scan + Circe + Venus + Flirt in one sync package. */
export const CREDITS_MESSAGE_GENERATION_BUNDLE = CREDITS_MESSAGE_GENERATION_LIGHT * 4
export const CREDITS_MESSAGE_SEND_PLATFORM = 1
export const CREDITS_DMCA_CLAIM = creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.dmcaClaimPrep)
export const CREDITS_LEAK_SCAN = creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.serperLeakScanRun)
/** Wide + social Serper batch (Mentions “Scan web” / `runReputationScanCore`). */
export const CREDITS_REPUTATION_WEB_SCAN = creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.serperReputationRun)
export const CREDITS_ONLYFANS_BIO_FALLBACK = creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolLight)

/** Expanded AI playbook for locating DMCA / abuse intake on unknown hosts (same unit weight as short gen). */
export const CREDITS_AI_TAKEDOWN_GUIDE = CREDITS_MESSAGE_GENERATION_LIGHT

/** One focused Grok page verification pass (~light tool workload). `/api/leaks/alerts/[id]/verify` does not debit credits today—used only for surfaced cost parity. */
export const CREDITS_LEAK_PAGE_VERIFY_ESTIMATE = creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolLight)

const CREDIT_OVERRIDES_BY_TOOL_ID: Record<string, number> = {
  'leak-scanner': CREDITS_LEAK_SCAN,
  'divine-chat': CREDITS_DIVINE_CHAT_MESSAGE,
  'mass-dm-composer': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolLight),
  'mass-dm-audience-suggester': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolMedium),
  'mass-dm-fan-captions': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolMedium),
  'mass-dm-ppv-pricing': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolMedium),
  'credits-planner': 0,
  'creator-mood-pulse': creditsForProviderUsdEstimate(0.004),
  'revenue-optimizer': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolMedium),
  'pricing-optimizer': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolMedium),
  'price-optimizer': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolMedium),
  'frame-ai-assist': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.frameAiAssistTurn),
  'frame-studio': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.toolLight),
  'ariadne-trace': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.ariadneEmbed),
  'ariadne-detect': creditsForProviderUsdEstimate(PROVIDER_USD_ESTIMATE.ariadneDetect),
  'onlyfans-bio-fallback': CREDITS_ONLYFANS_BIO_FALLBACK,
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
 * Protection (`cev-protection`): {@link PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS} fixed.
 * Paid: 20% of monthly USD (after seats) at CREDIT_USD_VALUE per credit.
 * Otherwise: trial cap.
 */
export function computeMonthlyCreditAllowance(row: SubscriptionRowForCredits): number {
  const planId = String(row.plan_id ?? '')
  if (isProtectionPlanId(planId)) {
    return PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS
  }
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
 * Monthly included AI credits for marketing UI (same formula as paid `computeMonthlyCreditAllowance`, 1 seat default).
 * Example: $100/mo → 2_000 credits ($1 subscription = 100 credits).
 */
export function includedCreditsForMarketing(monthlySubscriptionUsd: number, seats = 1): number {
  const total = Math.max(0, monthlySubscriptionUsd) * Math.max(1, Math.floor(seats))
  return Math.floor((total * 0.2) / CREDIT_USD_VALUE)
}

/**
 * Monthly cap for UI and server-side gating. Always applies the 20% rule for paid plans and ignores
 * legacy DB values (e.g. 999999) until Stripe/webhook rows are rewritten.
 */
export function effectiveMonthlyCreditLimit(
  row: SubscriptionRowForCredits & { ai_credits_limit?: number | null },
): number {
  const planId = String(row.plan_id ?? '')
  if (isProtectionPlanId(planId)) {
    return Math.max(0, computeMonthlyCreditAllowance(row))
  }

  const computed = computeMonthlyCreditAllowance(row)
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
  const canonical = resolveCanonicalToolId(toolId)
  const meta = ALL_TOOLS_META.find((t) => t.id === canonical)
  const c = meta?.credits
  if (typeof c === 'number' && c >= 0) return c
  return 1
}

/** UI copy for per-use cost (matches API debit via getCreditsForToolId). */
export function formatToolCreditCost(toolId: string): string {
  const n = getCreditsForToolId(toolId)
  if (n === 0) return 'Free'
  return `${n} credit${n !== 1 ? 's' : ''}`
}
