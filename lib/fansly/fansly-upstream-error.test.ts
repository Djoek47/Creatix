import assert from 'node:assert/strict'
import { formatFanslyUpstreamError, sanitizeFanslyPartnerMessage } from '@/lib/fansly/fansly-upstream-error'

assert.equal(sanitizeFanslyPartnerMessage('<!DOCTYPE html><html>'), undefined)
assert.equal(sanitizeFanslyPartnerMessage('  ok  '), 'ok')
assert.equal(formatFanslyUpstreamError(429, null), 'Fansly API rate limit — try again in a moment.')
assert.equal(formatFanslyUpstreamError(503, null), 'Fansly API is temporarily unavailable.')
assert.equal(formatFanslyUpstreamError(400, 'Bad token'), 'Bad token')
console.log('fansly-upstream-error tests ok')
