/**
 * Minimal reference for Markit-side (separate app) M2M calls to Creatix — no extra dependencies.
 * The Markit app is not in this repo; see https://github.com/Djoek47/markit
 * Run: node scripts/markit-v4-api-reference.mjs
 *
 * Required env:
 *   CREATIX_BASE_URL              e.g. https://your-creatix.vercel.app
 *   MARKIT_ARIADNE_SHARED_SECRET  same as on Creatix
 *   CREATIX_ACTOR_USER_ID         Supabase user UUID
 *
 * Optional: ARIADNE_E2E_CONTENT_ID, ARIADNE_E2E_RECIPIENT_KEY, ARIADNE_E2E_DETECT_FILE
 * — if set, runs a one-shot embed and/or detect (multipart).
 */
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const ARIADNE_CONTRACT_VERSION = 'v1.1'
const CREATIX = (process.env.CREATIX_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const SECRET = process.env.MARKIT_ARIADNE_SHARED_SECRET || ''
const ACTOR = process.env.CREATIX_ACTOR_USER_ID || ''

function sha256HexBuffer(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function signServiceMessage(msg) {
  return createHmac('sha256', SECRET).update(msg).digest('hex')
}

function buildSigningMessage({ method, pathname, timestamp, nonce, idempotencyKey, bodySha256 }) {
  return [method.toUpperCase(), pathname, timestamp, nonce, idempotencyKey, bodySha256].join('|')
}

function serviceHeaders({ pathname, method, bodySha256, idempotencyKey }) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = randomUUID()
  const idem = idempotencyKey || `markit-ref:${pathname}:${timestamp}:${nonce}`
  const message = buildSigningMessage({
    method,
    pathname,
    timestamp,
    nonce,
    idempotencyKey: idem,
    bodySha256,
  })
  const signature = signServiceMessage(message)
  const h = {
    'x-ariadne-contract-version': ARIADNE_CONTRACT_VERSION,
    'x-creatix-service': 'markit',
    'x-creatix-timestamp': timestamp,
    'x-creatix-nonce': nonce,
    'x-idempotency-key': idem,
    'x-creatix-signature': signature,
  }
  if (ACTOR) h['x-creatix-actor-user-id'] = ACTOR
  return h
}

async function run() {
  if (!SECRET || SECRET.length < 16) {
    console.error('Set MARKIT_ARIADNE_SHARED_SECRET (min 16 chars).')
    process.exit(1)
  }
  if (!ACTOR) {
    console.error('Set CREATIX_ACTOR_USER_ID (UUID) for M2M calls.')
    process.exit(1)
  }
  const contentId = process.env.ARIADNE_E2E_CONTENT_ID
  const recipientKey = process.env.ARIADNE_E2E_RECIPIENT_KEY || 'markit-ref-recipient'
  const detectFile = process.env.ARIADNE_E2E_DETECT_FILE

  console.log('markit-v4-api-reference: CREATIX_BASE_URL=', CREATIX)

  if (contentId) {
    const path = '/api/ariadne/embed'
    const body = JSON.stringify({
      contentId,
      recipientKey,
      source: 'frame_export',
      updateContentRow: false,
      lineage: { jobId: `ref-${Date.now()}`, pipelineVersion: 'markit-v4-api-reference' },
    })
    const bodySha = sha256HexBuffer(Buffer.from(body, 'utf8'))
    const res = await fetch(`${CREATIX}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...serviceHeaders({ pathname: path, method: 'POST', bodySha256: bodySha }),
      },
      body,
    })
    const j = await res.json().catch(() => ({}))
    console.log('embed', res.status, j)
  } else {
    console.log('(Set ARIADNE_E2E_CONTENT_ID to exercise embed.)')
  }

  if (detectFile) {
    const path = '/api/ariadne/detect'
    const fileBuf = await readFile(detectFile)
    const blob = new Blob([fileBuf], { type: 'video/mp4' })
    const form = new FormData()
    form.set('file', blob, 'sample.mp4')
    if (contentId) form.set('contentId', contentId)
    const res = await fetch(`${CREATIX}${path}`, {
      method: 'POST',
      headers: {
        ...serviceHeaders({ pathname: path, method: 'POST', bodySha256: '' }),
      },
      body: form,
    })
    const j = await res.json().catch(() => ({}))
    console.log('detect', res.status, j)
  } else {
    console.log('(Set ARIADNE_E2E_DETECT_FILE to exercise multipart detect.)')
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
