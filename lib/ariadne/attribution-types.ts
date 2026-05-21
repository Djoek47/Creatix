export type MarkitDetectionMethod = 'metadata' | 'visual' | 'both' | 'none'

/** Unified MarkIt / Ariadne attribution (DMCA + leak investigations). */
export type MarkitAttributionResult = {
  is_markit: boolean
  user_id: string | null
  watermark_id: string | null
  detection_method: MarkitDetectionMethod
  /** 0–100 */
  confidence: number
  /** Human-readable scan caveats (e.g. ffmpeg disabled). */
  warnings?: string[]
  evidence: {
    append_v1?: {
      state: string
      payload_id?: string
      content_id?: string
      recipient_key?: string
    }
    visual?: {
      sampled_frames: number
      watermark_hit_rate: number
      append_state: string
      payload_candidates: Array<{ payload_id: string; confidence: number; source: string }>
    }
    export?: {
      id: string
      content_id: string | null
      source: string | null
      created_at: string | null
    } | null
    /** Progressive / leak URL scan details (optional). */
    progressive?: {
      scan_stages?: string[]
      tail_append_hit?: boolean
      used_tail_range_fetch?: boolean
      ffmpeg_sampled_sec?: number[]
    }
  }
}

/** Response from `POST /api/leaks/alerts/[id]/attribution` (credits + fetch metadata). */
export type LeakAttributionApiResponse = MarkitAttributionResult & {
  creditsCharged: number
  leak_alert_id: string
  fetched_url: string
}
