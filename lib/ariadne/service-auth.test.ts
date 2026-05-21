import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  ARIADNE_CONTRACT_VERSION,
  buildServiceSigningMessage,
  serviceReplayWindowSec,
  sha256Hex,
  signServiceMessage,
} from '@/lib/ariadne/service-auth'
import { scopeIdempotencyKey } from '@/lib/ariadne/service-request-store'

function run() {
  process.env.MARKIT_ARIADNE_SHARED_SECRET = 'markit-contract-test-secret-12345'
  process.env.ARIADNE_SERVICE_REPLAY_WINDOW_SEC = '300'

  const body = JSON.stringify({
    contentId: randomUUID(),
    recipientKey: 'fan_42',
    source: 'frame_export',
  })
  const digest = sha256Hex(body)
  assert.equal(digest.length, 64)

  const msg = buildServiceSigningMessage({
    method: 'POST',
    pathname: '/api/ariadne/embed',
    timestamp: '1710000000',
    nonce: 'nonce-test',
    idempotencyKey: 'markit:embed:nonce-test',
    bodySha256: digest,
  })
  assert.ok(msg.startsWith('POST|/api/ariadne/embed|1710000000|'))

  const sigA = signServiceMessage(msg)
  const sigB = signServiceMessage(msg)
  assert.equal(sigA, sigB)
  assert.equal(sigA.length, 64)

  assert.equal(ARIADNE_CONTRACT_VERSION, 'v1.1')
  assert.equal(serviceReplayWindowSec(), 300)

  const u = '11111111-1111-4111-8111-111111111111'
  assert.equal(scopeIdempotencyKey({ userId: u, rawKey: 'a' }), `${u}::a`)

  console.log('service-auth.test.ts: all assertions passed')
}

run()

