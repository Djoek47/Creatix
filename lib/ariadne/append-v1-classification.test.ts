import assert from 'node:assert/strict'
import { createAriadnePayload, embedAppendV1, extractAppendV1Detailed } from '@/lib/ariadne-embed'

function run() {
  process.env.ARIADNE_SECRET = 'ariadne-test-secret-123456'

  const source = Buffer.from('video-bytes')
  const validPayload = createAriadnePayload({
    recipientKey: 'fan_123',
    contentId: 'content_1',
    userId: 'user_1',
    expSec: 3600,
  })
  const valid = embedAppendV1(source, validPayload)
  assert.equal(extractAppendV1Detailed(valid).state, 'marker_valid')

  const expiredPayload = createAriadnePayload({
    recipientKey: 'fan_123',
    contentId: 'content_1',
    userId: 'user_1',
    expSec: -1,
  })
  const expired = embedAppendV1(source, expiredPayload)
  assert.equal(extractAppendV1Detailed(expired).state, 'marker_expired')

  const tampered = Buffer.from(valid)
  tampered[tampered.length - 2] = tampered[tampered.length - 2] ^ 1
  assert.equal(extractAppendV1Detailed(tampered).state, 'marker_invalid_signature')

  assert.equal(extractAppendV1Detailed(source).state, 'no_marker')
  console.log('append-v1-classification.test.ts: all assertions passed')
}

run()

