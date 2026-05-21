import { createAriadnePayload, embedAppendV1, extractAppendV1Detailed } from '@/lib/ariadne-embed'
import { runDetectV2 } from '@/lib/ariadne/detect-v2'
import type { MarkitAttributionResult, MarkitDetectionMethod } from '@/lib/ariadne/attribution-types'

/**
 * End-to-end MarkIt attribution: in-band append-v1 (fast “metadata” path) + microdot / buffer visual path (detect-v2).
 * Does not perform DB lookups — use `enrichAttributionWithExport` in the API layer when you have a Supabase client.
 */
export function analyzeMarkitAttribution(buf: Buffer, seed = 42): MarkitAttributionResult {
  const append = extractAppendV1Detailed(buf)
  const v2 = runDetectV2(buf, seed)

  const hasAppend = append.state === 'marker_valid' && append.payload
  const hasVisual = v2.payload_candidates.some(
    (c) => c.source === 'watermark_v2' || c.source === 'watermark_v2_uuid',
  )

  let detection_method: MarkitDetectionMethod = 'none'
  if (hasAppend && hasVisual) detection_method = 'both'
  else if (hasAppend) detection_method = 'metadata'
  else if (hasVisual) detection_method = 'visual'

  const userId = hasAppend ? append.payload?.userId ?? null : null

  let watermarkId: string | null = null
  if (hasAppend) watermarkId = append.payload?.payloadId ?? null
  if (!watermarkId) {
    const vis = v2.payload_candidates.find((c) => c.source === 'watermark_v2_uuid' || c.source === 'watermark_v2')
    watermarkId = vis?.payload_id ?? null
  }

  const confFromAppend = hasAppend ? 0.99 : 0
  const confFromVisual = hasVisual ? v2.confidence : 0
  const conf01 = Math.max(confFromAppend, confFromVisual, hasAppend ? 0 : 0)
  const confidence = Math.max(0, Math.min(100, Math.round(conf01 * 100)))

  const is_markit =
    Boolean(hasAppend) ||
    (hasVisual && v2.confidence >= 0.35) ||
    (v2.payload_candidates.some((c) => c.source === 'watermark_v2_uuid') && v2.confidence >= 0.4)

  return {
    is_markit,
    user_id: userId,
    watermark_id: watermarkId,
    detection_method,
    confidence,
    evidence: {
      append_v1: {
        state: append.state,
        payload_id: append.payload?.payloadId,
        content_id: append.payload?.contentId,
        recipient_key: append.payload?.recipientKey,
      },
      visual: {
        sampled_frames: v2.evidence_summary.sampled_frames,
        watermark_hit_rate: v2.evidence_summary.watermark_hit_rate,
        append_state: v2.evidence_summary.append_state,
        payload_candidates: v2.payload_candidates.map((c) => ({
          payload_id: c.payload_id,
          confidence: c.confidence,
          source: c.source,
        })),
      },
    },
  }
}

export function enrichAttributionWithExport(
  base: MarkitAttributionResult,
  exportRow: {
    id: string
    content_id: string | null
    source: string | null
    created_at: string | null
  } | null,
): MarkitAttributionResult {
  return {
    ...base,
    evidence: {
      ...base.evidence,
      export: exportRow
        ? {
            id: exportRow.id,
            content_id: exportRow.content_id,
            source: exportRow.source,
            created_at: exportRow.created_at,
          }
        : null,
    },
  }
}

/**
 * Test helper: build a small MP4-like buffer with a valid append-v1 marker (no re-encode).
 */
export function makeAppendV1TestBuffer(input: { userId: string; contentId: string; recipientKey: string }): Buffer {
  const payload = createAriadnePayload({
    userId: input.userId,
    contentId: input.contentId,
    recipientKey: input.recipientKey,
    expSec: 86400 * 3650,
  })
  const base = Buffer.alloc(64, 0x47)
  return embedAppendV1(base, payload)
}
