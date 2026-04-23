import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { createAriadnePayload, embedAppendV1, sha256Hex } from '@/lib/ariadne-embed'
import { VAULT_EXPORT_MAX_BYTES, VAULT_MEDIA_BUCKET, vaultExportObjectPath } from '@/lib/frame-vault-media'

const ARIADNE_EMBED_MAX_BYTES = Math.min(80 * 1024 * 1024, VAULT_EXPORT_MAX_BYTES)

type AriadneSource = 'frame_export' | 'vault_standalone' | 'message_send' | 'mass_dm'

type AriadneRecipientInput = {
  fanId?: string
  platform?: 'onlyfans' | 'fansly' | 'mym'
  platformFanId?: string
  username?: string
  displayName?: string
}

type AriadneOriginInput = {
  messageId?: string
  massBatchId?: string
}

type CreateAriadneTraceInput = {
  supabase: SupabaseClient
  userId: string
  contentId: string
  recipientKey: string
  source: AriadneSource
  recipient?: AriadneRecipientInput
  origin?: AriadneOriginInput
  lineage?: {
    jobId?: string
    pipelineVersion?: string
    encoderProfile?: string
  }
  updateContentRow?: boolean
}

type CreateAriadneTraceResult =
  | {
      ok: true
      payloadId: string
      exportId: string
      creditsCharged: number
      downloadUrl: string
      exportPath: string
      contentId: string
      recipientKey: string
      source: AriadneSource
      lineage: {
        jobId: string | null
        pipelineVersion: string | null
        encoderProfile: string | null
      }
    }
  | { ok: false; status: number; error: string; code?: string; used?: number; limit?: number }

function serviceClientOrError() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key)
}

export async function createAriadneTraceExport(input: CreateAriadneTraceInput): Promise<CreateAriadneTraceResult> {
  const service = serviceClientOrError()
  if (!service) {
    return { ok: false, status: 500, error: 'Server misconfiguration' }
  }

  const recipientKey = input.recipientKey.trim()
  if (!recipientKey) {
    return { ok: false, status: 400, error: 'recipientKey is required' }
  }

  const toolCost = getCreditsForToolId('ariadne-trace')
  const gate = await hasEnoughAiCredits(input.supabase, input.userId, toolCost)
  if (!gate.ok) {
    return {
      ok: false,
      status: 402,
      error: 'Insufficient AI credits',
      code: 'ai_credits_exhausted',
      used: gate.used,
      limit: gate.limit,
    }
  }

  const { data: contentRow, error: contentErr } = await service
    .from('content')
    .select('id, user_id, title, content_type, file_url, vault_storage_path')
    .eq('id', input.contentId)
    .eq('user_id', input.userId)
    .maybeSingle()

  if (contentErr || !contentRow) {
    return { ok: false, status: 404, error: 'Content not found' }
  }

  const ct = String(contentRow.content_type || '').toLowerCase()
  if (ct !== 'video' && !ct.includes('video')) {
    return { ok: false, status: 400, error: 'Ariadne Trace applies to video content only' }
  }

  let buf: Buffer
  try {
    if (contentRow.vault_storage_path) {
      const { data: dl, error: dErr } = await service.storage
        .from(VAULT_MEDIA_BUCKET)
        .download(contentRow.vault_storage_path)
      if (dErr || !dl) {
        return { ok: false, status: 500, error: dErr?.message || 'Could not download source file' }
      }
      buf = Buffer.from(await dl.arrayBuffer())
    } else if (contentRow.file_url && /^https?:\/\//i.test(contentRow.file_url)) {
      const r = await fetch(contentRow.file_url)
      if (!r.ok) return { ok: false, status: 502, error: 'Could not fetch source file URL' }
      buf = Buffer.from(await r.arrayBuffer())
    } else {
      return { ok: false, status: 400, error: 'No downloadable video on this content item' }
    }
  } catch (error) {
    return { ok: false, status: 500, error: error instanceof Error ? error.message : 'Download failed' }
  }

  if (buf.length > ARIADNE_EMBED_MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `Video too large for Ariadne embed in this deployment (max ${ARIADNE_EMBED_MAX_BYTES} bytes)`,
    }
  }

  let payload: ReturnType<typeof createAriadnePayload>
  try {
    payload = createAriadnePayload({
      recipientKey,
      contentId: input.contentId,
      userId: input.userId,
    })
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: error instanceof Error ? error.message : 'ARIADNE_SECRET / FRAME_BRIDGE_SECRET not configured',
    }
  }

  const before = sha256Hex(buf)
  const out = embedAppendV1(buf, payload)
  const after = sha256Hex(out)
  const exportPath = vaultExportObjectPath(input.userId, input.contentId, `ariadne-${payload.payloadId}.mp4`)

  const { error: uploadErr } = await service.storage.from(VAULT_MEDIA_BUCKET).upload(exportPath, out, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (uploadErr) return { ok: false, status: 500, error: uploadErr.message || 'Upload failed' }

  const signedSeconds = 60 * 24 * 60 * 60
  const { data: signed, error: signErr } = await service.storage
    .from(VAULT_MEDIA_BUCKET)
    .createSignedUrl(exportPath, signedSeconds)
  if (signErr || !signed?.signedUrl) {
    return { ok: false, status: 500, error: signErr?.message || 'Could not sign URL' }
  }

  let recipientFanId: string | null = null
  let recipientPlatform: 'onlyfans' | 'fansly' | 'mym' | null = null
  let recipientPlatformFanId: string | null = null
  let recipientUsername: string | null = null
  let recipientDisplayName: string | null = null

  if (input.recipient?.fanId) {
    const { data: fan } = await service
      .from('fans')
      .select('id, platform, platform_fan_id, username, display_name')
      .eq('id', input.recipient.fanId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (fan) {
      recipientFanId = fan.id
      recipientPlatform = (fan.platform as 'onlyfans' | 'fansly' | 'mym') ?? null
      recipientPlatformFanId = fan.platform_fan_id ?? null
      recipientUsername = fan.username ?? null
      recipientDisplayName = fan.display_name ?? null
    }
  } else if (input.recipient?.platform && input.recipient?.platformFanId) {
    const { data: fan } = await service
      .from('fans')
      .select('id, platform, platform_fan_id, username, display_name')
      .eq('user_id', input.userId)
      .eq('platform', input.recipient.platform)
      .eq('platform_fan_id', input.recipient.platformFanId)
      .maybeSingle()
    if (fan) {
      recipientFanId = fan.id
      recipientPlatform = (fan.platform as 'onlyfans' | 'fansly' | 'mym') ?? null
      recipientPlatformFanId = fan.platform_fan_id ?? null
      recipientUsername = fan.username ?? null
      recipientDisplayName = fan.display_name ?? null
    } else {
      recipientPlatform = input.recipient.platform
      recipientPlatformFanId = input.recipient.platformFanId
    }
  }

  if (!recipientUsername && input.recipient?.username) recipientUsername = input.recipient.username
  if (!recipientDisplayName && input.recipient?.displayName) recipientDisplayName = input.recipient.displayName
  if (!recipientPlatform && input.recipient?.platform) recipientPlatform = input.recipient.platform
  if (!recipientPlatformFanId && input.recipient?.platformFanId) recipientPlatformFanId = input.recipient.platformFanId

  const { data: exportRow, error: insertErr } = await service
    .from('ariadne_exports')
    .insert({
      user_id: input.userId,
      content_id: input.contentId,
      content_title: contentRow.title ?? null,
      recipient_key: recipientKey,
      recipient_fan_id: recipientFanId,
      recipient_platform: recipientPlatform,
      recipient_platform_fan_id: recipientPlatformFanId,
      recipient_username: recipientUsername,
      recipient_display_name: recipientDisplayName,
      source: input.source,
      origin_message_id: input.origin?.messageId ?? null,
      origin_mass_batch_id: input.origin?.massBatchId ?? null,
      algorithm_version: 'append-v1',
      payload_id: payload.payloadId,
      payload_manifest: payload as unknown as Record<string, unknown>,
      file_sha256_before: before,
      file_sha256_after: after,
      export_path: exportPath,
      job_id: input.lineage?.jobId?.trim() || null,
      pipeline_version: input.lineage?.pipelineVersion?.trim() || null,
      encoder_profile: input.lineage?.encoderProfile?.trim() || null,
    })
    .select('id')
    .single()

  if (insertErr || !exportRow) {
    return { ok: false, status: 500, error: insertErr?.message || 'Could not save Ariadne record' }
  }

  if (input.updateContentRow) {
    await service
      .from('content')
      .update({
        file_url: signed.signedUrl,
        vault_storage_path: exportPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.contentId)
      .eq('user_id', input.userId)
  }

  const reasonRef = `ariadne:${payload.payloadId}`
  const debit = await consumeAiCredits(input.supabase, input.userId, toolCost, {
    reasonCode: 'ariadne_trace',
    reasonRef,
    idempotencyKey: `${reasonRef}:${input.userId}`,
    metadata: {
      tool: 'ariadne-trace',
      payload_id: payload.payloadId,
      content_id: input.contentId,
      source: input.source,
      recipient_key: recipientKey,
      recipient_fan_id: recipientFanId,
      recipient_platform: recipientPlatform,
      recipient_platform_fan_id: recipientPlatformFanId,
      origin_message_id: input.origin?.messageId ?? null,
      origin_mass_batch_id: input.origin?.massBatchId ?? null,
      export_path: exportPath,
    },
  })

  if (!debit.ok) {
    return { ok: false, status: 500, error: 'Credit debit failed after embed' }
  }

  return {
    ok: true,
    payloadId: payload.payloadId,
    exportId: exportRow.id,
    creditsCharged: toolCost,
    downloadUrl: signed.signedUrl,
    exportPath,
    contentId: input.contentId,
    recipientKey,
    source: input.source,
    lineage: {
      jobId: input.lineage?.jobId?.trim() || null,
      pipelineVersion: input.lineage?.pipelineVersion?.trim() || null,
      encoderProfile: input.lineage?.encoderProfile?.trim() || null,
    },
  }
}
