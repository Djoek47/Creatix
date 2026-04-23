import { createHmac, randomUUID } from 'crypto'

export type AriadnePayloadV2 = {
  v: 2
  payloadRef: string
  contentId: string
  exp: number
  sig: string
}

function secret(): string {
  const s = process.env.ARIADNE_SECRET || process.env.FRAME_BRIDGE_SECRET
  if (!s || s.length < 16) throw new Error('ARIADNE_SECRET / FRAME_BRIDGE_SECRET missing for payload v2')
  return s
}

function sign(parts: string[]): string {
  return createHmac('sha256', secret()).update(parts.join('|'), 'utf8').digest('base64url')
}

/**
 * Payload v2 intentionally excludes recipient identity.
 * Recipient mapping is kept in authority DB rows keyed by payloadRef.
 */
export function createAriadnePayloadV2(input: {
  contentId: string
  recipientKey: string
  userId: string
  expSec?: number
}): AriadnePayloadV2 & { linkageHash: string } {
  const payloadRef = `ar2_${randomUUID().replace(/-/g, '')}`
  const exp = Math.floor(Date.now() / 1000) + (input.expSec ?? 86400 * 365)
  const linkageHash = sign([input.userId, input.contentId, input.recipientKey, payloadRef, 'link'])
  const sig = sign([payloadRef, input.contentId, String(exp), linkageHash, 'v2'])
  return {
    v: 2,
    payloadRef,
    contentId: input.contentId,
    exp,
    sig,
    linkageHash,
  }
}

