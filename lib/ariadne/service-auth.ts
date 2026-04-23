import { createHmac, createHash, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const ARIADNE_CONTRACT_VERSION = 'v1.1'

const SERVICE_HEADER = 'x-creatix-service'
const TIMESTAMP_HEADER = 'x-creatix-timestamp'
const NONCE_HEADER = 'x-creatix-nonce'
const SIGNATURE_HEADER = 'x-creatix-signature'
const IDEMPOTENCY_HEADER = 'x-idempotency-key'
const CONTRACT_VERSION_HEADER = 'x-ariadne-contract-version'

function boolEnv(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function getServiceSecret(): string {
  const secret = process.env.MARKIT_ARIADNE_SHARED_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('MARKIT_ARIADNE_SHARED_SECRET must be configured (min 16 chars)')
  }
  return secret
}

export function isServiceAuthEnforced(): boolean {
  return boolEnv(process.env.ARIADNE_SERVICE_AUTH_ENFORCED)
}

export function serviceReplayWindowSec(): number {
  const raw = process.env.ARIADNE_SERVICE_REPLAY_WINDOW_SEC
  const n = raw ? Number.parseInt(raw, 10) : 300
  if (!Number.isFinite(n) || n < 30) return 300
  return n
}

export function sha256Hex(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function buildServiceSigningMessage(input: {
  method: string
  pathname: string
  timestamp: string
  nonce: string
  idempotencyKey: string
  bodySha256: string
}): string {
  return [
    input.method.toUpperCase(),
    input.pathname,
    input.timestamp,
    input.nonce,
    input.idempotencyKey,
    input.bodySha256,
  ].join('|')
}

export function signServiceMessage(message: string): string {
  return createHmac('sha256', getServiceSecret()).update(message).digest('hex')
}

export type ParsedServiceHeaders = {
  contractVersion: string
  serviceName: string
  timestamp: string
  nonce: string
  signature: string
  idempotencyKey: string
}

export type ServiceAuthValidationResult =
  | { ok: true; headers: ParsedServiceHeaders }
  | { ok: false; status: number; error: string }

export function parseServiceHeaders(request: NextRequest): ServiceAuthValidationResult {
  const contractVersion = request.headers.get(CONTRACT_VERSION_HEADER)?.trim() || ''
  const serviceName = request.headers.get(SERVICE_HEADER)?.trim() || ''
  const timestamp = request.headers.get(TIMESTAMP_HEADER)?.trim() || ''
  const nonce = request.headers.get(NONCE_HEADER)?.trim() || ''
  const signature = request.headers.get(SIGNATURE_HEADER)?.trim() || ''
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER)?.trim() || ''

  if (!serviceName && !signature && !timestamp && !nonce) {
    return { ok: false, status: 401, error: 'Missing service auth headers' }
  }
  if (contractVersion !== ARIADNE_CONTRACT_VERSION) {
    return { ok: false, status: 400, error: `Unsupported contract version: ${contractVersion || 'none'}` }
  }
  if (!serviceName || !timestamp || !nonce || !signature || !idempotencyKey) {
    return { ok: false, status: 400, error: 'Incomplete service auth headers' }
  }

  return {
    ok: true,
    headers: {
      contractVersion,
      serviceName,
      timestamp,
      nonce,
      signature,
      idempotencyKey,
    },
  }
}

export function isServiceRequest(request: NextRequest): boolean {
  return Boolean(request.headers.get(SERVICE_HEADER)?.trim())
}

export function verifyServiceSignature(input: {
  request: NextRequest
  headers: ParsedServiceHeaders
  bodySha256: string
}): ServiceAuthValidationResult {
  const unixSec = Number.parseInt(input.headers.timestamp, 10)
  if (!Number.isFinite(unixSec)) {
    return { ok: false, status: 400, error: 'Invalid service timestamp' }
  }
  const now = Math.floor(Date.now() / 1000)
  const drift = Math.abs(now - unixSec)
  if (drift > serviceReplayWindowSec()) {
    return { ok: false, status: 401, error: 'Service timestamp outside replay window' }
  }

  const pathname = new URL(input.request.url).pathname
  const message = buildServiceSigningMessage({
    method: input.request.method,
    pathname,
    timestamp: input.headers.timestamp,
    nonce: input.headers.nonce,
    idempotencyKey: input.headers.idempotencyKey,
    bodySha256: input.bodySha256,
  })
  const expected = signServiceMessage(message)
  try {
    if (!timingSafeEqual(Buffer.from(input.headers.signature), Buffer.from(expected))) {
      return { ok: false, status: 401, error: 'Invalid service signature' }
    }
  } catch {
    return { ok: false, status: 401, error: 'Invalid service signature format' }
  }
  return { ok: true, headers: input.headers }
}

