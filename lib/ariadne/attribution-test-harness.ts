import { randomUUID } from 'node:crypto'
import { analyzeMarkitAttribution, makeAppendV1TestBuffer } from '@/lib/ariadne/attribution-analyze'
import { detectWatermark, embedWatermark, type GrayFrame } from '@/lib/ariadne/watermark-engine'
import { bitsToUuidWithDashes, uuidHexToBits } from '@/lib/ariadne/payload-id-bits'

const SEED = 42
const THRESH = 0.45

function blankFrame(w: number, h: number, v = 120): GrayFrame {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => v))
}

function addNoiseDeterministic(frame: GrayFrame, magnitude = 4, salt = 7): GrayFrame {
  let s = salt
  const rnd = () => {
    s = (s * 1103515245 + 12345) >>> 0
    return (s / 0xffffffff) * 2 - 1
  }
  return frame.map((row) =>
    row.map((p) => Math.max(0, Math.min(255, p + Math.floor(rnd() * magnitude)))),
  )
}

function simulateScreenshotDegrade(frame: GrayFrame): GrayFrame {
  const down = frame.map((row) => row.map((p) => Math.floor(p * 0.95 + 5)))
  return addNoiseDeterministic(down, 5, 99)
}

export type HarnessCaseResult = {
  test_case: string
  success: boolean
  detected_user: string | null
  method: string
  confidence: number
  is_markit: boolean
  error?: string
}

export type HarnessReport = {
  passed: number
  failed: number
  results: HarnessCaseResult[]
  generated_at: string
}

/**
 * In-process MarkIt attribution test suite (append-v1 + microdot frame roundtrips with transforms).
 * Does not hit the network or DB; safe for CI if `ARIADNE_SECRET` / `FRAME_BRIDGE_SECRET` is set for append tests.
 */
export function runAttributionTestSuite(testUserId: string): HarnessReport {
  const results: HarnessCaseResult[] = []
  const contentId = randomUUID()
  const recipientKey = 'harness-fan-1'
  const payloadId = randomUUID()

  // --- 1) append-v1 original ---
  let buf: Buffer
  try {
    buf = makeAppendV1TestBuffer({ userId: testUserId, contentId, recipientKey })
  } catch (e) {
    return {
      passed: 0,
      failed: 1,
      results: [
        {
          test_case: 'append_v1_harness_setup',
          success: false,
          detected_user: null,
          method: 'none',
          confidence: 0,
          is_markit: false,
          error: e instanceof Error ? e.message : 'ARIADNE_SECRET or FRAME_BRIDGE_SECRET missing',
        },
      ],
      generated_at: new Date().toISOString(),
    }
  }

  const a1 = analyzeMarkitAttribution(buf)
  results.push({
    test_case: 'append_v1_original',
    success: a1.is_markit && a1.user_id === testUserId && a1.detection_method === 'metadata',
    detected_user: a1.user_id,
    method: a1.detection_method,
    confidence: a1.confidence,
    is_markit: a1.is_markit,
  })

  // --- 2) append-v1 idempotent second pass ---
  const aStable = analyzeMarkitAttribution(buf)
  results.push({
    test_case: 'append_v1_idempotent',
    success: aStable.is_markit && aStable.user_id === testUserId,
    detected_user: aStable.user_id,
    method: aStable.detection_method,
    confidence: aStable.confidence,
    is_markit: aStable.is_markit,
  })

  // --- 3) visual microdot roundtrip on synthetic frame (128-bit payload UUID) ---
  const hex = payloadId.replace(/-/g, '')
  const bits = uuidHexToBits(hex)
  const frame = blankFrame(64, 64, 128)
  const embedded = embedWatermark(frame, bits, { seed: SEED, strength: 3, redundancy: 4, useSpatialLayer: true })
  const det0 = detectWatermark(embedded, { seed: SEED, redundancy: 4, expectedBits: 128 })
  const recovered0 = bitsToUuidWithDashes(det0.bits)
  results.push({
    test_case: 'visual_frame_roundtrip',
    success: recovered0 === payloadId && det0.confidence >= THRESH,
    detected_user: null,
    method: 'visual',
    confidence: Math.round(det0.confidence * 100),
    is_markit: recovered0 === payloadId,
  })

  // --- 4) screenshot-like degradation ---
  const degraded = simulateScreenshotDegrade(embedded)
  const det1 = detectWatermark(degraded, { seed: SEED, redundancy: 4, expectedBits: 128 })
  const recovered1 = bitsToUuidWithDashes(det1.bits)
  results.push({
    test_case: 'visual_screenshot_degraded',
    success: recovered1 === payloadId,
    detected_user: null,
    method: 'visual',
    confidence: Math.round(det1.confidence * 100),
    is_markit: recovered1 === payloadId,
  })

  const passed = results.filter((r) => r.success).length
  return {
    passed,
    failed: results.length - passed,
    results,
    generated_at: new Date().toISOString(),
  }
}
