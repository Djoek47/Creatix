import assert from 'node:assert/strict'
import {
  allowedAdultPlatformsForFocusPicker,
  focusConnectedPlatformsMismatch,
  inboxPlatformFilterOptionsForSubscription,
} from '@/lib/billing/platform-variant'

assert.deepEqual(
  inboxPlatformFilterOptionsForSubscription({
    status: 'active',
    billing_variant: 'single',
    billing_focus_platforms: ['onlyfans'],
    billing_focus_platform: 'onlyfans',
  }),
  ['all', 'onlyfans'],
)

assert.deepEqual(
  inboxPlatformFilterOptionsForSubscription({
    status: 'active',
    billing_variant: 'multi',
    billing_focus_platforms: null,
    billing_focus_platform: null,
  }),
  ['all', 'onlyfans', 'fansly'],
)

assert.deepEqual(
  allowedAdultPlatformsForFocusPicker({
    status: 'active',
    billing_variant: 'single',
    billing_focus_platforms: ['onlyfans'],
    billing_focus_platform: 'onlyfans',
  }),
  ['onlyfans'],
)

assert.equal(
  allowedAdultPlatformsForFocusPicker({
    status: 'active',
    billing_variant: 'single',
    billing_focus_platforms: ['onlyfans', 'fansly'],
    billing_focus_platform: 'onlyfans',
  }),
  undefined,
  'Two platforms on Focus → full picker',
)

assert.equal(
  focusConnectedPlatformsMismatch(
    {
      status: 'active',
      billing_variant: 'single',
      billing_focus_platforms: ['onlyfans'],
      billing_focus_platform: 'onlyfans',
    },
    [
      { platform: 'onlyfans', is_connected: true },
      { platform: 'fansly', is_connected: true },
    ],
  )?.code,
  'FOCUS_CONNECTED_PLATFORM_MISMATCH',
  'Fansly connected but not on OF-only Focus plan',
)

assert.equal(
  focusConnectedPlatformsMismatch(
    {
      status: 'active',
      billing_variant: 'single',
      billing_focus_platforms: ['fansly'],
      billing_focus_platform: 'fansly',
    },
    [{ platform: 'onlyfans', is_connected: true }],
  )?.code,
  'FOCUS_CONNECTED_PLATFORM_MISMATCH',
  'OnlyFans connected but not on Fansly-only Focus plan',
)

assert.equal(
  focusConnectedPlatformsMismatch(
    {
      status: 'active',
      billing_variant: 'single',
      billing_focus_platforms: ['onlyfans'],
      billing_focus_platform: 'onlyfans',
    },
    [{ platform: 'onlyfans', is_connected: true }],
  ),
  null,
  'OF-only plan with OnlyFans only',
)

assert.equal(
  focusConnectedPlatformsMismatch(
    {
      status: 'canceled',
      billing_variant: 'single',
      billing_focus_platforms: ['onlyfans'],
      billing_focus_platform: 'onlyfans',
    },
    [
      { platform: 'onlyfans', is_connected: true },
      { platform: 'fansly', is_connected: true },
    ],
  ),
  null,
  'Canceled subscription does not enforce Focus mismatch',
)

console.log('platform-variant-focus: ok')
