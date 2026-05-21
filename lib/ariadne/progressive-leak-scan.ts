import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'
import { extractAppendV1Detailed, type AriadnePayloadV1 } from '@/lib/ariadne-embed'
import { analyzeMarkitAttribution } from '@/lib/ariadne/attribution-analyze'
import { detectWatermark, type GrayFrame } from '@/lib/ariadne/watermark-engine'
import { bitsToUuidWithDashes } from '@/lib/ariadne/payload-id-bits'
import type { MarkitAttributionResult } from '@/lib/ariadne/attribution-types'
import { isAriadneFfmpegLeakScanEnabled } from '@/lib/ariadne/feature-flags'

const execFileAsync = promisify(execFile)

const TAIL_WINDOW_BYTES = 8 * 1024 * 1024
/** Sample timestamps (seconds) for ffmpeg still extraction — "play until" style sweep (bounded). */
const FFMPEG_SAMPLE_TIMES = [0, 0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60]

function ffmpegCmd(): string {
  return (process.env.FFMPEG_PATH || 'ffmpeg').trim() || 'ffmpeg'
}

function applyAppendWinner(
  base: MarkitAttributionResult,
  payload: AriadnePayloadV1,
  appendState: string,
  extraProgressive: MarkitAttributionResult['evidence']['progressive'],
): MarkitAttributionResult {
  const hasVisual =
    base.detection_method === 'visual' ||
    base.detection_method === 'both' ||
    (base.evidence.visual?.payload_candidates?.length ?? 0) > 0
  return {
    ...base,
    is_markit: true,
    user_id: payload.userId,
    watermark_id: payload.payloadId,
    detection_method: hasVisual ? 'both' : 'metadata',
    confidence: 99,
    evidence: {
      ...base.evidence,
      append_v1: {
        state: appendState,
        payload_id: payload.payloadId,
        content_id: payload.contentId,
        recipient_key: payload.recipientKey,
      },
      progressive: { ...base.evidence.progressive, ...extraProgressive },
    },
  }
}

async function pngToGrayFrame(png: Buffer, size: number): Promise<GrayFrame> {
  const { data, info } = await sharp(png)
    .resize(size, size, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const frame: GrayFrame = []
  for (let y = 0; y < h; y++) {
    const row: number[] = []
    for (let x = 0; x < w; x++) {
      row.push(data[y * w + x] ?? 0)
    }
    frame.push(row)
  }
  return frame
}

async function tryFfmpegFramePng(
  filePath: string,
  tSec: number,
  ff: string,
): Promise<Buffer | null> {
  const args = ['-y', '-ss', String(tSec), '-i', filePath, '-vframes', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']
  try {
    const { stdout } = await execFileAsync(ff, args, { maxBuffer: 25 * 1024 * 1024, timeout: 60_000 })
    if (stdout.length < 80) return null
    return Buffer.from(stdout)
  } catch {
    return null
  }
}

/**
 * 1) append-v1 on tail window (EOI marker) then full buffer
 * 2) optional ffmpeg decodes real frames and runs 128-bit microdot detect
 * 3) fall back to `analyzeMarkitAttribution` (heuristic buffer path)
 */
export async function progressiveMarkitAttributionFromBuffer(
  buf: Buffer,
  options?: { seed?: number; skipFfmpeg?: boolean },
): Promise<MarkitAttributionResult & { scan_stages: string[] }> {
  const seed = options?.seed ?? 42
  const scan_stages: string[] = []
  const warnings: string[] = []
  const base = analyzeMarkitAttribution(buf, seed)
  if (!buf.length) {
    return { ...base, warnings: ['Empty buffer'], scan_stages: ['empty'] }
  }

  const tailN = Math.min(TAIL_WINDOW_BYTES, buf.length)
  const tail = buf.subarray(buf.length - tailN)
  scan_stages.push('append_v1_tail')
  const appendTail = extractAppendV1Detailed(tail)
  if (appendTail.state === 'marker_valid' && appendTail.payload) {
    scan_stages.push('append_v1_tail_hit')
    return {
      ...applyAppendWinner(base, appendTail.payload, appendTail.state, {
        tail_append_hit: true,
        scan_stages: ['append_v1_tail', 'hit'],
      }),
      scan_stages,
    }
  }

  scan_stages.push('append_v1_full')
  const appendFull = extractAppendV1Detailed(buf)
  if (appendFull.state === 'marker_valid' && appendFull.payload) {
    scan_stages.push('append_v1_full_hit')
    return {
      ...applyAppendWinner(base, appendFull.payload, appendFull.state, {
        tail_append_hit: false,
        scan_stages: [...scan_stages, 'append_full'],
      }),
      scan_stages,
    }
  }

  if (!options?.skipFfmpeg && isAriadneFfmpegLeakScanEnabled() && buf.length > 12_000) {
    const ff = ffmpegCmd()
    const tmp = join(tmpdir(), `ariadne-leak-${randomUUID()}.bin`)
    try {
      await writeFile(tmp, buf)
      scan_stages.push('ffmpeg_stills')
      for (const t of FFMPEG_SAMPLE_TIMES) {
        const png = await tryFfmpegFramePng(tmp, t, ff)
        if (!png) continue
        const frame = await pngToGrayFrame(png, 64)
        const det = detectWatermark(frame, { seed, redundancy: 3, expectedBits: 128 })
        const uuid = det.bits.length >= 128 ? bitsToUuidWithDashes(det.bits.slice(0, 128)) : null
        if (uuid && /-/.test(uuid) && det.confidence >= 0.42) {
          scan_stages.push(`ffmpeg_uuid_hit@${t}`)
          return {
            is_markit: true,
            user_id: null,
            watermark_id: uuid,
            detection_method: 'visual',
            confidence: Math.max(0, Math.min(100, Math.round(det.confidence * 100))),
            warnings,
            evidence: {
              ...base.evidence,
              visual: {
                sampled_frames: 1,
                watermark_hit_rate: det.hitRate,
                append_state: appendFull.state,
                payload_candidates: [
                  { payload_id: uuid, confidence: det.confidence, source: 'watermark_v2_uuid' },
                ],
              },
              progressive: {
                ffmpeg_sampled_sec: [t],
                scan_stages,
              },
            },
            scan_stages: [...scan_stages, 'done_ffmpeg'],
          }
        }
      }
      scan_stages.push('ffmpeg_no_confident_uuid')
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : 'ffmpeg still extraction failed')
      scan_stages.push('ffmpeg_error')
    } finally {
      try {
        await unlink(tmp)
      } catch {
        // ignore
      }
    }
  } else {
    warnings.push(
      'In-frame microdot scan (decoded video frames) is off or skipped. Enable ARIADNE_FFMPEG_LEAK_SCAN=1 and install ffmpeg. Append-v1 in-file marker is still read from bytes.',
    )
  }

  if (!base.is_markit) {
    warnings.push(
      'No confident Markit match: re-encoded or host-only streams may strip markers. Try a direct file download when possible.',
    )
  }
  return {
    ...base,
    warnings: [...(base.warnings ?? []), ...warnings],
    evidence: {
      ...base.evidence,
      progressive: { scan_stages: [...scan_stages, 'heuristic'] },
    },
    scan_stages: [...scan_stages, 'done'],
  }
}
