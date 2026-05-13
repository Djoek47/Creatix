/**
 * Encode a UUID (with or without dashes) into exactly 128 bits — one bit per hex digit's LSB pattern
 * (4 bits per hex char, 32 chars). Used to link microdot layers to `ariadne_exports.payload_id`.
 */
const HEX = /^[0-9a-f]{32}$/i

export function normalizePayloadIdHex(id: string): string | null {
  const s = id.replace(/-/g, '').toLowerCase()
  return HEX.test(s) ? s : null
}

/** 32 hex chars → 128 bits (MSB first within each hex digit: high nibble then low nibble). */
export function uuidHexToBits(hex32: string): number[] {
  const h = normalizePayloadIdHex(hex32)
  if (!h) return []
  const bits: number[] = []
  for (let i = 0; i < h.length; i++) {
    const v = parseInt(h[i]!, 16)
    for (let b = 3; b >= 0; b--) bits.push((v >> b) & 1 ? 1 : 0)
  }
  return bits
}

/** 128 bits → 32 hex chars (lowercase). */
export function bitsToUuidHex(bits: number[]): string | null {
  if (bits.length < 128) return null
  let out = ''
  for (let i = 0; i < 128; i += 4) {
    let v = 0
    for (let b = 0; b < 4; b++) v = (v << 1) | (bits[i + b] ? 1 : 0)
    out += v.toString(16)
  }
  return /^[0-9a-f]{32}$/.test(out) ? out : null
}

export function bitsToUuidWithDashes(bits: number[]): string | null {
  const hex = bitsToUuidHex(bits)
  if (!hex) return null
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
