import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export type StoredLocationPayload = {
  label: string
  city?: string
  country?: string
  timezone?: string
  latitude: number
  longitude: number
  source: 'manual' | 'geolocation' | 'preset'
  savedAt: string
}

const IV_BYTES = 12
const TAG_BYTES = 16

function getVaultSecret() {
  const secret =
    process.env.LOCATION_VAULT_SECRET ||
    process.env.FRAME_BRIDGE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.trim().length < 16) {
    throw new Error('Location vault secret is missing or too short')
  }
  return secret
}

function deriveKey(userId: string): Buffer {
  return createHash('sha256')
    .update(`${getVaultSecret()}:${userId}:wellbeing-location-v1`)
    .digest()
}

export function encryptLocationPayload(userId: string, payload: StoredLocationPayload): string {
  const iv = randomBytes(IV_BYTES)
  const key = deriveKey(userId)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptLocationPayload(userId: string, encryptedBase64: string): StoredLocationPayload {
  const packed = Buffer.from(encryptedBase64, 'base64')
  if (packed.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('Invalid encrypted location payload')
  }
  const iv = packed.subarray(0, IV_BYTES)
  const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const encrypted = packed.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(userId), iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  const parsed = JSON.parse(plaintext) as StoredLocationPayload
  if (
    !parsed ||
    typeof parsed.label !== 'string' ||
    typeof parsed.latitude !== 'number' ||
    typeof parsed.longitude !== 'number'
  ) {
    throw new Error('Decrypted location payload is malformed')
  }
  return parsed
}
