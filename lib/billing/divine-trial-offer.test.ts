import assert from 'node:assert/strict'
import {
  isDivineTrialSeatHeld,
  shouldShowDivineTrialStartCard,
  divineTrialSubtitleBadge,
  TRIAL_PLAN_ID,
  FREE_PLAN_ID,
} from '@/lib/billing/access'

assert.equal(
  shouldShowDivineTrialStartCard({
    plan_id: TRIAL_PLAN_ID,
    status: 'trial',
    stripe_subscription_id: null,
    trial_ends_at: null,
  }),
  true,
  'pre-checkout trial row shows offer',
)

assert.equal(
  shouldShowDivineTrialStartCard({
    plan_id: TRIAL_PLAN_ID,
    status: 'trial',
    stripe_subscription_id: 'sub_123',
    trial_ends_at: null,
  }),
  false,
  'stripe subscription exists — hide even if status still trial',
)

assert.equal(
  shouldShowDivineTrialStartCard({
    plan_id: TRIAL_PLAN_ID,
    status: 'trialing',
    stripe_subscription_id: 'sub_123',
    trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
  }),
  false,
  'active trialing hides offer',
)

assert.equal(
  shouldShowDivineTrialStartCard({
    plan_id: FREE_PLAN_ID,
    status: 'canceled',
    stripe_subscription_id: null,
    trial_ends_at: null,
  }),
  false,
  'lapsed to free plan hides repeat trial',
)

assert.equal(
  isDivineTrialSeatHeld({
    plan_id: TRIAL_PLAN_ID,
    status: 'trial',
    stripe_subscription_id: 'sub_x',
  }),
  true,
)

assert.equal(
  divineTrialSubtitleBadge({
    plan_id: TRIAL_PLAN_ID,
    status: 'trialing',
    stripe_subscription_id: 'sub_1',
    trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
  }),
  'redeemed',
)

assert.equal(
  divineTrialSubtitleBadge({
    plan_id: FREE_PLAN_ID,
    status: 'canceled',
    stripe_subscription_id: null,
    trial_ends_at: null,
  }),
  'expired',
)

console.log('divine-trial-offer.test.ts: ok')
