import { createHmac, timingSafeEqual } from 'crypto'

export const FANSLY_MASS_OTP_COOKIE = 'creatix_fl_mass_otp'

/** Prefer `FANSLY_MASS_OTP_SECRET`; else `FANSLY_WEBHOOK_SECRET` (same server already holds it). */
function signingSecret(): string {
  return (
    process.env.FANSLY_MASS_OTP_SECRET?.trim() ||
    process.env.FANSLY_WEBHOOK_SECRET?.trim() ||
    ''
  )
}

/** When true, Fansly mass / campaign sends require a recent verify-otp cookie. */
export function isFanslyMassOtpEnforced(): boolean {
  return signingSecret().length >= 8
}

type Payload = { sub: string; exp: number }

function signPayloadB64(payloadB64: string): string {
  return createHmac('sha256', signingSecret()).update(payloadB64, 'utf8').digest('base64url')
}

/** Signed cookie value `{sub,exp}.sig` (base64url JSON). Empty if no signing secret. */
export function mintFanslyMassOtpCookieValue(userId: string, ttlSeconds = 900): string {
  if (!isFanslyMassOtpEnforced()) return ''
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payloadB64 = Buffer.from(JSON.stringify({ sub: userId, exp } satisfies Payload), 'utf8').toString(
    'base64url',
  )
  return `${payloadB64}.${signPayloadB64(payloadB64)}`
}

export function verifyFanslyMassOtpCookieValue(cookieValue: string | undefined, userId: string): boolean {
  if (!isFanslyMassOtpEnforced() || !cookieValue?.trim()) return false
  const dot = cookieValue.lastIndexOf('.')
  if (dot <= 0) return false
  const payloadB64 = cookieValue.slice(0, dot)
  const sig = cookieValue.slice(dot + 1)
  const expected = signPayloadB64(payloadB64)
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(sig, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }
  let parsed: Payload
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Payload
  } catch {
    return false
  }
  if (parsed.sub !== userId) return false
  if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) return false
  return true
}

export function fanslyMassOtpCookieOptions(maxAgeSeconds: number) {
  return {
    path: '/',
    maxAge: maxAgeSeconds,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}
