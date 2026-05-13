import { createHash } from 'crypto'
import { detectWatermark, type GrayFrame } from '@/lib/ariadne/watermark-engine'
import { extractAppendV1Detailed } from '@/lib/ariadne-embed'
import { extractDetectionFrames } from '@/lib/ariadne/media-ffmpeg'
import { bitsToUuidWithDashes } from '@/lib/ariadne/payload-id-bits'

export type DetectV2Result = {
  match_state: 'none' | 'candidate' | 'registered'
  payload_candidates: Array<{
    payload_id: string
    confidence: number
    source: 'append_v1' | 'watermark_v2' | 'watermark_v2_uuid'
  }>
  confidence: number
  evidence_summary: {
    sampled_frames: number
    contributing_regions: number
    append_state: string
    watermark_hit_rate: number
  }
}

function frameFromBufferChunk(chunk: Buffer, width = 32, height = 32): GrayFrame {
  const frame: GrayFrame = []
  let idx = 0
  for (let y = 0; y < height; y++) {
    const row: number[] = []
    for (let x = 0; x < width; x++) {
      row.push(chunk[idx % Math.max(1, chunk.length)] ?? 0)
      idx += 1
    }
    frame.push(row)
  }
  return frame
}

function sampledFrames(buf: Buffer, count = 6): GrayFrame[] {
  const step = Math.max(1, Math.floor(buf.length / count))
  const frames: GrayFrame[] = []
  for (let i = 0; i < count; i++) {
    const start = Math.min(buf.length, i * step)
    const end = Math.min(buf.length, start + 1024)
    const chunk = buf.subarray(start, Math.max(start + 1, end))
    frames.push(frameFromBufferChunk(chunk))
  }
  return frames
}

function bitsToHex(bits: number[]): string {
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0
    for (let b = 0; b < 8; b++) value = (value << 1) | (bits[i + b] ? 1 : 0)
    bytes.push(value)
  }
  return Buffer.from(bytes).toString('hex')
}

export function runDetectV2(buf: Buffer, seed = 42): DetectV2Result {
  const append = extractAppendV1Detailed(buf)
  const frames = sampledFrames(buf, 8)
  return runDetectV2OnFrames(buf, frames, append.state, append.payload?.payloadId ?? null, seed)
}

export async function runDetectV2FromMedia(buf: Buffer, seed = 42): Promise<DetectV2Result> {
  const append = extractAppendV1Detailed(buf)
  const frames = await extractDetectionFrames(buf, 8)
  if (!frames.length) return runDetectV2(buf, seed)
  return runDetectV2OnFrames(buf, frames, append.state, append.payload?.payloadId ?? null, seed)
}

function runDetectV2OnFrames(
  buf: Buffer,
  frames: GrayFrame[],
  appendState: string,
  appendPayloadId: string | null,
  seed: number,
): DetectV2Result {
  const scores = frames.map((frame) => detectWatermark(frame, { seed, redundancy: 3, expectedBits: 40 }))
  const scores128 = frames.map((frame) => detectWatermark(frame, { seed, redundancy: 3, expectedBits: 128 }))
  const avgConfidence = scores.reduce((acc, s) => acc + s.confidence, 0) / Math.max(1, scores.length)
  const avgHit = scores.reduce((acc, s) => acc + s.hitRate, 0) / Math.max(1, scores.length)
  const best = scores.sort((a, b) => b.confidence - a.confidence)[0]
  const best128 = scores128.sort((a, b) => b.confidence - a.confidence)[0]
  const uuidFromVisual =
    best128 && best128.bits.length >= 128
      ? bitsToUuidWithDashes(best128.bits.slice(0, 128))
      : null
  const watermarkCandidate = best ? bitsToHex(best.bits) : ''
  const watermarkPayloadId =
    uuidFromVisual ||
    (watermarkCandidate
      ? `wmv2_${createHash('sha256').update(watermarkCandidate).digest('hex').slice(0, 24)}`
      : '')

  const payload_candidates: DetectV2Result['payload_candidates'] = []
  if (appendState === 'marker_valid' && appendPayloadId) {
    payload_candidates.push({
      payload_id: appendPayloadId,
      confidence: 0.97,
      source: 'append_v1',
    })
  }
  if (watermarkPayloadId) {
    payload_candidates.push({
      payload_id: watermarkPayloadId,
      confidence: Number((uuidFromVisual ? best128?.confidence : avgConfidence).toFixed(4)),
      source: uuidFromVisual ? 'watermark_v2_uuid' : 'watermark_v2',
    })
  }

  let match_state: DetectV2Result['match_state'] = 'none'
  if (appendState === 'marker_valid') match_state = 'registered'
  else if (payload_candidates.length) match_state = 'candidate'

  const visualConf = uuidFromVisual && best128 ? best128.confidence : avgConfidence
  const confidence = appendState === 'marker_valid' ? 0.97 : Number(visualConf.toFixed(4))
  return {
    match_state,
    payload_candidates,
    confidence,
    evidence_summary: {
      sampled_frames: frames.length,
      contributing_regions: frames.length * 2,
      append_state: appendState,
      watermark_hit_rate: Number(avgHit.toFixed(4)),
    },
  }
}

