import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AriadneEmbedV2JobInput = {
  userId: string
  contentId: string
  recipientKey: string
  source: 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm'
  pipelineVersion?: string
  encoderProfile?: string
  idempotencyKey?: string
}

export type AriadneEmbedV2JobRow = {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  frame_count: number | null
  embedded_windows: number | null
  psnr: number | null
  ssim: number | null
  size_delta_bytes: number | null
}

export async function enqueueAriadneEmbedV2Job(
  supabase: SupabaseClient,
  input: AriadneEmbedV2JobInput,
): Promise<{ ok: true; job: AriadneEmbedV2JobRow } | { ok: false; error: string }> {
  const idempotencyKey =
    input.idempotencyKey?.trim() || `ariadne_embed_v2:${input.userId}:${input.contentId}:${input.recipientKey}`
  const existing = await supabase
    .from('ariadne_v2_jobs')
    .select('id,status,frame_count,embedded_windows,psnr,ssim,size_delta_bytes')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing.data) {
    return { ok: true, job: existing.data as AriadneEmbedV2JobRow }
  }

  const jobId = randomUUID()
  const { data, error } = await supabase
    .from('ariadne_v2_jobs')
    .insert({
      id: jobId,
      user_id: input.userId,
      content_id: input.contentId,
      recipient_key: input.recipientKey,
      source: input.source,
      status: 'queued',
      idempotency_key: idempotencyKey,
      pipeline_version: input.pipelineVersion ?? 'hybrid-v2',
      encoder_profile: input.encoderProfile ?? 'h264-main',
    })
    .select('id,status,frame_count,embedded_windows,psnr,ssim,size_delta_bytes')
    .single()

  if (error || !data) return { ok: false, error: error?.message || 'Could not queue embed-v2 job' }
  return { ok: true, job: data as AriadneEmbedV2JobRow }
}

/**
 * Placeholder metrics writer for async workers.
 * Dedicated worker processes should update this row after FFmpeg embedding.
 */
export async function markAriadneEmbedV2JobCompleted(
  supabase: SupabaseClient,
  jobId: string,
  metrics: {
    frameCount: number
    embeddedWindows: number
    psnr: number
    ssim: number
    sizeDeltaBytes: number
  },
) {
  await supabase
    .from('ariadne_v2_jobs')
    .update({
      status: 'completed',
      frame_count: metrics.frameCount,
      embedded_windows: metrics.embeddedWindows,
      psnr: metrics.psnr,
      ssim: metrics.ssim,
      size_delta_bytes: metrics.sizeDeltaBytes,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

