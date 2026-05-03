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
  shouldShowDivineTrialStartCard({
    plan_id: TRIAL_PLAN_ID,
    status: 'trialing',
    stripe_subscription_id: 'sub_123',
    trial_ends_at: new Date(Date.now() - 86400000).toISOString(),
  }),
  false,
  'trial end passed hides offer even if status still trialing (stale sync)',
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

assert.equal(
  divineTrialSubtitleBadge({
    plan_id: TRIAL_PLAN_ID,
    status: 'trialing',
    stripe_subscription_id: 'sub_1',
    trial_ends_at: new Date(Date.now() - 3600000).toISOString(),
  }),
  'expired',
  'after trial_end clock, badge is expired not redeemed',
)

assert.equal(
  shouldShowDivineTrialStartCard({
    plan_id: TRIAL_PLAN_ID,
    status: 'trialing',
    stripe_subscription_id: 'sub_123',
    trial_ends_at: null,
    current_period_end: new Date(Date.now() - 86400000).toISOString(),
  }),
  false,
  'hide CTA when trial_ends_at missing but current_period_end (trialing window) is past',
)

assert.equal(
  divineTrialSubtitleBadge({
    plan_id: TRIAL_PLAN_ID,
    status: 'trialing',
    stripe_subscription_id: 'sub_1',
    trial_ends_at: null,
    current_period_end: new Date(Date.now() - 7200000).toISOString(),
  }),
  'expired',
  'badge expired using current_period_end fallback',
)

console.log('divine-trial-offer.test.ts: ok')
