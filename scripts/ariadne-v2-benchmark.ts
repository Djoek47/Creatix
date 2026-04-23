import assert from 'node:assert/strict'
import { runDetectV2 } from '@/lib/ariadne/detect-v2'

type Sample = {
  label: string
  buffer: Buffer
}

function mockTransform(base: Buffer, type: string): Buffer {
  const out = Buffer.from(base)
  if (type === 'crop-5') return out.subarray(Math.floor(out.length * 0.05))
  if (type === 'crop-10') return out.subarray(Math.floor(out.length * 0.1))
  if (type === 'blur') {
    for (let i = 1; i < out.length - 1; i++) out[i] = Math.floor((out[i - 1] + out[i] + out[i + 1]) / 3)
  }
  if (type === 'noise') {
    for (let i = 0; i < out.length; i += 32) out[i] = out[i] ^ 1
  }
  if (type === 'transcode-low') {
    for (let i = 0; i < out.length; i++) out[i] = out[i] & 0b11111100
  }
  return out
}

function run() {
  const base = Buffer.from(Array.from({ length: 8192 }, (_, i) => i % 255))
  const transforms = ['crop-5', 'crop-10', 'blur', 'noise', 'transcode-low']
  const samples: Sample[] = transforms.map((t) => ({ label: t, buffer: mockTransform(base, t) }))
  const results = samples.map((s) => ({
    label: s.label,
    detect: runDetectV2(s.buffer),
  }))

  const avgConfidence =
    results.reduce((acc, r) => acc + r.detect.confidence, 0) / Math.max(1, results.length)
  assert.ok(Number.isFinite(avgConfidence))
  console.log(
    JSON.stringify(
      {
        benchmark: 'ariadne-v2',
        samples: results.map((r) => ({
          label: r.label,
          confidence: r.detect.confidence,
          match_state: r.detect.match_state,
        })),
        averageConfidence: avgConfidence,
      },
      null,
      2,
    ),
  )
}

run()

