import { createHmac, createHash, randomUUID } from 'crypto'

const MARKER_PREFIX = Buffer.from('CREATIX_ARID:v1:', 'utf8')

function getAriadneSecret(): string {
  const s = process.env.ARIADNE_SECRET || process.env.FRAME_BRIDGE_SECRET
  if (!s || s.length < 16) {
    throw new Error('ARIADNE_SECRET or FRAME_BRIDGE_SECRET must be set (min 16 chars) for Ariadne')
  }
  return s
}

export interface AriadnePayloadV1 {
  v: 1
  payloadId: string
  recipientKey: string
  contentId: string
  userId: string
  exp: number
  sig: string
}

function signPayload(parts: string[]): string {
  const msg = parts.join('|')
  return createHmac('sha256', getAriadneSecret()).update(msg, 'utf8').digest('base64url')
}

export function createAriadnePayload(input: {
  recipientKey: string
  contentId: string
  userId: string
  expSec?: number
}): AriadnePayloadV1 {
  const payloadId = randomUUID()
  const exp = Math.floor(Date.now() / 1000) + (input.expSec ?? 86400 * 365)
  const sig = signPayload([payloadId, input.recipientKey, input.contentId, input.userId, String(exp), 'v1'])
  return {
    v: 1,
    payloadId,
    recipientKey: input.recipientKey.slice(0, 500),
    contentId: input.contentId,
    userId: input.userId,
    exp,
    sig,
  }
}

export function verifyAriadnePayload(p: Partial<AriadnePayloadV1>): p is AriadnePayloadV1 {
  if (!p || p.v !== 1 || !p.payloadId || !p.recipientKey || !p.contentId || !p.userId || !p.exp || !p.sig) {
    return false
  }
  const expected = signPayload([p.payloadId, p.recipientKey, p.contentId, p.userId, String(p.exp), 'v1'])
  if (expected !== p.sig) return false
  if (p.exp < Math.floor(Date.now() / 1000)) return false
  return true
}

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

/** Append signed marker bytes to video buffer (MVP append-v1). */
export function embedAppendV1(video: Buffer, payload: AriadnePayloadV1): Buffer {
  const json = Buffer.from(JSON.stringify(payload), 'utf8')
  return Buffer.concat([video, MARKER_PREFIX, json])
}

function extractBalancedJson(buf: Buffer, start: number): string | null {
  if (start >= buf.length || buf[start] !== 0x7b) return null
  let depth = 0
  for (let i = start; i < buf.length; i++) {
    const c = buf[i]
    if (c === 0x7b) depth++
    else if (c === 0x7d) {
      depth--
      if (depth === 0) return buf.subarray(start, i + 1).toString('utf8')
    }
  }
  return null
}

/** Extract marker from buffer; returns null if not found or invalid. */
export function extractAppendV1(buf: Buffer): AriadnePayloadV1 | null {
  const magic = MARKER_PREFIX
  const idx = buf.lastIndexOf(magic)
  if (idx < 0) return null
  const jsonStart = idx + magic.length
  const raw = extractBalancedJson(buf, jsonStart)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<AriadnePayloadV1>
    if (!verifyAriadnePayload(p)) return null
    return p
  } catch {
    return null
  }
}
