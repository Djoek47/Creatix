import assert from 'node:assert/strict'
import { detectWatermark, embedWatermark, type GrayFrame } from '@/lib/ariadne/watermark-engine'

function blankFrame(w: number, h: number, value = 128): GrayFrame {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => value))
}

function run() {
  const bits = [1, 0, 1, 1, 0, 0, 1, 0]
  const frame = blankFrame(64, 64, 124)
  const embedded = embedWatermark(frame, bits, {
    seed: 42,
    strength: 1,
    redundancy: 3,
    useSpatialLayer: true,
  })
  const detected = detectWatermark(embedded, {
    seed: 42,
    redundancy: 3,
    expectedBits: bits.length,
  })

  assert.equal(detected.bits.length, bits.length)
  assert.ok(detected.confidence > 0.8, `expected confidence > 0.8, got ${detected.confidence}`)
  assert.deepEqual(detected.bits, bits)
  console.log('watermark-engine.test.ts: all assertions passed')
}

run()

