import { encodeWithParity, repeatBits } from '@/lib/ariadne/watermark-engine/ecc'
import { normalizePayloadIdHex, uuidHexToBits } from '@/lib/ariadne/payload-id-bits'
import type { GrayFrame, WatermarkEmbedOptions } from '@/lib/ariadne/watermark-engine/types'

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s
  }
}

function cloneFrame(frame: GrayFrame): GrayFrame {
  return frame.map((row) => [...row])
}

export type WatermarkEmbeddingPlan = {
  algorithm: 'frame-v2'
  payloadId: string
  payloadBits: number[]
  options: Required<WatermarkEmbedOptions>
}

export function buildWatermarkEmbeddingPlan(input: {
  payloadId: string
  strength?: number
  redundancy?: number
  useSpatialLayer?: boolean
  seed?: number
}): WatermarkEmbeddingPlan {
  const hex = normalizePayloadIdHex(input.payloadId)
  if (!hex) throw new Error('payloadId must be a UUID or 32-char hex string')
  return {
    algorithm: 'frame-v2',
    payloadId: input.payloadId,
    payloadBits: uuidHexToBits(hex),
    options: {
      seed: input.seed ?? 42,
      strength: Math.max(1, Math.floor(input.strength ?? 1)),
      redundancy: Math.max(1, Math.floor(input.redundancy ?? 3)),
      useSpatialLayer: input.useSpatialLayer ?? true,
    },
  }
}

/**
 * Deterministic pseudo-DCT-like embedding:
 * - Adjusts low-significance intensity in pseudo-random mid-field positions.
 * - Optional spatial layer toggles neighboring pixel contrast to improve recovery.
 */
export function embedWatermark(
  inputFrame: GrayFrame,
  payloadBits: number[],
  options: WatermarkEmbedOptions,
): GrayFrame {
  const frame = cloneFrame(inputFrame)
  if (!frame.length || !frame[0]?.length) return frame
  const h = frame.length
  const w = frame[0].length
  const rand = lcg(options.seed)
  const strength = Math.max(1, Math.floor(options.strength ?? 1))
  const redundancy = Math.max(1, Math.floor(options.redundancy ?? 3))
  const encoded = repeatBits(encodeWithParity(payloadBits), redundancy)

  for (let i = 0; i < encoded.length; i++) {
    const y = 2 + (rand() % Math.max(1, h - 4))
    const x = 2 + (rand() % Math.max(1, w - 4))
    const current = frame[y][x] ?? 0
    const targetParity = encoded[i] ? 1 : 0
    const currentParity = current & 1
    const delta = currentParity === targetParity ? 0 : strength
    frame[y][x] = Math.max(0, Math.min(255, current + delta))

    if (options.useSpatialLayer) {
      const nY = Math.min(h - 1, y + 1)
      const nX = Math.min(w - 1, x + 1)
      const n = frame[nY][nX] ?? 0
      frame[nY][nX] = Math.max(0, Math.min(255, encoded[i] ? n + 1 : n - 1))
    }
  }

  return frame
}

