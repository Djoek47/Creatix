/**
 * Run: pnpm exec tsx lib/onlyfans-api-errors.test.ts
 */
import assert from 'node:assert/strict'
import {
  isOnlyFansRateLimitError,
  isOnlyFansUpstreamTransientError,
} from '@/lib/onlyfans-api'

function run() {
  assert.equal(
    isOnlyFansUpstreamTransientError(
      'OnlyFans returned an unknown error [403] You probably need to use a real performer account to access this endpoint.',
    ),
    true,
    '403 unknown error from partner',
  )
  assert.equal(
    isOnlyFansUpstreamTransientError('ONLYFANS_COM_ERROR: something'),
    true,
    'error code substring',
  )
  assert.equal(isOnlyFansUpstreamTransientError('ONLYFANS_SESSION_EXPIRED'), false)
  assert.equal(isOnlyFansRateLimitError('CF:ONLYFANS_COM_RATE_LIMIT_ERROR_v3'), true)
}

run()
console.log('onlyfans-api-errors: ok')
