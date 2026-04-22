import assert from 'node:assert/strict'
import { buildCreditPlan } from '@/lib/billing/credit-planner'
import {
  allocateDebitBetweenBuckets,
  purchasedTopupExpiryFromSubscription,
} from '@/lib/billing/credit-wallet'

function run() {
  const plan = buildCreditPlan({
    monthlyCreditsAvailable: 2000,
    creatorSize: 'solo',
    priorities: ['dm_growth', 'dmca'],
    targetActivityVolume: {
      messages: 1200,
      leakScans: 12,
      reputationScans: 8,
      chatTurns: 800,
    },
  })
  assert.ok(plan.allocations.length >= 4)
  assert.ok(plan.estimatedDaysToDepletion > 0)
  assert.ok(plan.projectedMonthlySpend <= 2000)

  const debitA = allocateDebitBetweenBuckets(100, 50, 80)
  assert.deepEqual(debitA, { includedSpent: 80, purchasedSpent: 0, ok: true })
  const debitB = allocateDebitBetweenBuckets(20, 50, 40)
  assert.deepEqual(debitB, { includedSpent: 20, purchasedSpent: 20, ok: true })
  const debitC = allocateDebitBetweenBuckets(5, 10, 20)
  assert.deepEqual(debitC, { includedSpent: 5, purchasedSpent: 10, ok: false })

  const expiry = purchasedTopupExpiryFromSubscription({
    current_period_start: '2026-04-01T00:00:00.000Z',
    current_period_end: '2026-05-01T00:00:00.000Z',
  })
  assert.equal(expiry.toISOString(), '2026-06-01T00:00:00.000Z')

  console.log('credit-planner.test.ts: all assertions passed')
}

run()
