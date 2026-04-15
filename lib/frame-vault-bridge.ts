import { createHmac, timingSafeEqual } from 'crypto'

/** HMAC tokens for Frame bridge: asset proxy read + export callback. */
const encoder = new TextEncoder()

function getBridgeSecret(): string {
  const s = process.env.FRAME_BRIDGE_SECRET
  if (!s || s.length < 16) {
    throw new Error('FRAME_BRIDGE_SECRET must be set (min 16 chars)')
  }
  return s
}

function signPayload(parts: string[]): string {
  const msg = parts.join('|')
  return createHmac('sha256', getBridgeSecret()).update(encoder.encode(msg)).digest('base64url')
}

export interface FrameTokenPayload {
  contentId: string
  userId: string
  exp: number
}

function pack(payload: FrameTokenPayload & { sig: string }): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function unpack(token: string): FrameTokenPayload & { sig: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    return JSON.parse(raw) as FrameTokenPayload & { sig: string }
  } catch {
    return null
  }
}

/** Short-lived token for GET /api/content/vault/[id]/asset?t= */
export function createAssetReadToken(contentId: string, userId: string, expSec = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expSec
  const sig = signPayload([contentId, userId, String(exp), 'asset-read'])
  return pack({ contentId, userId, exp, sig })
}

export function verifyAssetReadToken(token: string): FrameTokenPayload | null {
  const p = unpack(token)
  if (!p?.sig || !p.contentId || !p.userId || !p.exp) return null
  const expected = signPayload([p.contentId, p.userId, String(p.exp), 'asset-read'])
  try {
    if (!timingSafeEqual(Buffer.from(p.sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  if (p.exp < Math.floor(Date.now() / 1000)) return null
  return { contentId: p.contentId, userId: p.userId, exp: p.exp }
}

/** Token Frame POSTs back with multipart export (paired with FRAME_EXPORT_SECRET header). */
export function createExportToken(contentId: string, userId: string, expSec = 7200): string {
  const exp = Math.floor(Date.now() / 1000) + expSec
  const sig = signPayload([contentId, userId, String(exp), 'export'])
  return pack({ contentId, userId, exp, sig })
}

export function verifyExportToken(token: string): FrameTokenPayload | null {
  const p = unpack(token)
  if (!p?.sig || !p.contentId || !p.userId || !p.exp) return null
  const expected = signPayload([p.contentId, p.userId, String(p.exp), 'export'])
  try {
    if (!timingSafeEqual(Buffer.from(p.sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  if (p.exp < Math.floor(Date.now() / 1000)) return null
  return { contentId: p.contentId, userId: p.userId, exp: p.exp }
}
