/**
 * Run: pnpm run test:leaks
 * Assertions for URL normalization and duplicate / reopen rules (no DB).
 */
import assert from 'node:assert/strict'
import { normalizeUrl } from '@/lib/leaks/url-utils'
import {
  canReopenResolvedLeak,
  inferMediaTypeFromUrl,
  shouldSkipDuplicateScan,
} from '@/lib/leaks/canonical-dedupe'

function run() {
  assert.equal(
    normalizeUrl('https://www.Example.com/path/?utm_source=x'),
    normalizeUrl('https://example.com/path'),
    'www + utm should canonicalize to same key',
  )

  assert.equal(inferMediaTypeFromUrl('https://cdn/x/video/123'), 'video')
  assert.equal(inferMediaTypeFromUrl('https://cdn/x/photo.jpg'), 'photo')

  assert.equal(shouldSkipDuplicateScan('detected'), true)
  assert.equal(shouldSkipDuplicateScan('dmca_sent'), true)
  assert.equal(shouldSkipDuplicateScan('resolved'), false)
  assert.equal(canReopenResolvedLeak('resolved'), true)
  assert.equal(canReopenResolvedLeak('detected'), false)

  console.log('canonical-logic.test.ts: all assertions passed')
}

run()
