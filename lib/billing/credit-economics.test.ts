/**
 * Run: pnpm run test:credits
 *
 * Verifies 20% monthly USD → credits (floor) for paid tiers; trial cap; seats multiplier.
 * Aligns with subscriptionFinancialFieldsFromMerged / syncSubscriptionCreditsFromPlanAction (same formula).
 *
 * Example monthly USD by tier (Focus OF single line, from REVENUE_TIERS / getMonthlyPriceUsd):
 * tier 0 → OnlyFans list price from matrix → 20% → credits; tier 10 → $500 → 20% = $100 → 10_000 credits (× seats).
 */
import assert from 'node:assert/strict'
import {
  CREDIT_USD_VALUE,
  TRIAL_AI_CREDITS_LIMIT,
  PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS,
  computeMonthlyCreditAllowance,
  effectiveMonthlyCreditLimit,
  includedCreditsForMarketing,
} from '@/lib/billing/credit-economics'
import { PAID_PLAN_ID, PROTECTION_PLAN_ID } from '@/lib/billing/access'
import { getMonthlyPriceUsd, TIER_COUNT } from '@/lib/pricing-matrix'

function expectedPaidCredits(
  variant: 'single' | 'multi',
  tierIndex: number,
  seats: number,
  focusPlatforms?: ('onlyfans' | 'fansly' | 'manyvids')[] | null,
): number {
  const monthlyUsd = getMonthlyPriceUsd(variant, tierIndex, focusPlatforms)
  const totalUsd = monthlyUsd * Math.max(1, seats)
  return Math.floor((totalUsd * 0.2) / CREDIT_USD_VALUE)
}

function run() {
  assert.equal(
    computeMonthlyCreditAllowance({ plan_id: 'divine-trial' }),
    TRIAL_AI_CREDITS_LIMIT,
    'trial plan uses fixed cap',
  )
  assert.equal(
    computeMonthlyCreditAllowance({ plan_id: null }),
    TRIAL_AI_CREDITS_LIMIT,
    'missing plan is not paid',
  )

  const paid = { plan_id: PAID_PLAN_ID, billing_variant: 'single' as const, revenue_tier: 0, billing_seats: 1 }
  assert.equal(
    computeMonthlyCreditAllowance(paid),
    expectedPaidCredits('single', 0, 1, ['onlyfans']),
    'tier 0 single OF matches getMonthlyPriceUsd × 20%',
  )

  const tier10 = { ...paid, revenue_tier: 10 }
  assert.equal(
    computeMonthlyCreditAllowance(tier10),
    expectedPaidCredits('single', 10, 1, ['onlyfans']),
    'tier 10 (max index) matches formula',
  )
  assert.equal(TIER_COUNT - 1, 10, 'sanity: tier index 10 is last band')

  const multi = {
    plan_id: PAID_PLAN_ID,
    billing_variant: 'multi' as const,
    revenue_tier: 5,
    billing_seats: 1,
  }
  assert.equal(
    computeMonthlyCreditAllowance(multi),
    expectedPaidCredits('multi', 5, 1),
    'multi (Bundled OF+FL) price at tier 5',
  )

  const seats3 = {
    plan_id: PAID_PLAN_ID,
    billing_variant: 'single' as const,
    revenue_tier: 3,
    billing_seats: 3,
  }
  assert.equal(
    computeMonthlyCreditAllowance(seats3),
    expectedPaidCredits('single', 3, 3, ['onlyfans']),
    'seats multiply monthly USD before 20%',
  )

  assert.equal(
    computeMonthlyCreditAllowance({
      plan_id: PAID_PLAN_ID,
      billing_variant: 'single',
      revenue_tier: undefined,
      billing_seats: 1,
    }),
    expectedPaidCredits('single', 0, 1, ['onlyfans']),
    'missing revenue_tier defaults to 0',
  )


  assert.equal(
    includedCreditsForMarketing(100, 1),
    2000,
    '$100/mo → 20% → $20 → 2000 credits at $0.01/credit',
  )

  assert.equal(
    computeMonthlyCreditAllowance({ plan_id: PROTECTION_PLAN_ID }),
    PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS,
    'protection plan uses fixed monthly credits (not 20% of $25)',
  )
  assert.equal(
    effectiveMonthlyCreditLimit({ plan_id: PROTECTION_PLAN_ID, ai_credits_limit: 999000 }),
    PROTECTION_PLAN_MONTHLY_INCLUDED_CREDITS,
    'effective cap for protection ignores legacy huge ai_credits_limit',
  )

  console.log('credit-economics.test.ts: all assertions passed')
}

run()
