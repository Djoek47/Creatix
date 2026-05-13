import { randomUUID } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  getServiceActorUserId,
  parseServiceHeaders,
  sha256Hex,
  verifyServiceSignature,
} from '@/lib/ariadne/service-auth'
import { embedFrameV2IntoMp4 } from '@/lib/ariadne/media-ffmpeg'
import { buildWatermarkEmbeddingPlan } from '@/lib/ariadne/watermark-engine'
import { normalizePayloadIdHex } from '@/lib/ariadne/payload-id-bits'

export const runtime = 'nodejs'
export const maxDuration = 300

type EmbedV2Body = {
  mediaUrl?: unknown
  recipientLabel?: unknown
  payloadId?: unknown
  callbackUrl?: unknown
}

type ParsedEmbedV2Body = {
  mediaUrl: string
  recipientLabel: string
  payloadId: string
  callbackUrl?: string
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function parseHttpsUrl(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`)
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`${field} must be http(s)`)
  return url.toString()
}

function parseBody(raw: string): ParsedEmbedV2Body {
  const body = JSON.parse(raw || '{}') as EmbedV2Body
  const mediaUrl = parseHttpsUrl(body.mediaUrl, 'mediaUrl')
  if (typeof body.recipientLabel !== 'string' || !body.recipientLabel.trim()) {
    throw new Error('recipientLabel is required')
  }
  if (typeof body.payloadId !== 'string' || !normalizePayloadIdHex(body.payloadId)) {
    throw new Error('payloadId must be a UUID or 32-char hex string')
  }
  const callbackUrl = body.callbackUrl != null ? parseHttpsUrl(body.callbackUrl, 'callbackUrl') : undefined
  return {
    mediaUrl,
    recipientLabel: body.recipientLabel.trim().slice(0, 500),
    payloadId: body.payloadId,
    callbackUrl,
  }
}

async function downloadMp4(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`mediaUrl download failed with ${res.status}`)
  const contentType = res.headers.get('content-type') || ''
  if (contentType && !/video\/mp4|application\/octet-stream/i.test(contentType)) {
    throw new Error(`mediaUrl must point to an MP4; received ${contentType}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1024) throw new Error('mediaUrl returned an empty or invalid MP4')
  return buf
}

async function ensureContentRow(supabase: SupabaseClient, input: {
  userId: string
  mediaUrl: string
  recipientLabel: string
}) {
  const { data, error } = await supabase
    .from('content')
    .insert({
      user_id: input.userId,
      title: `Ariadne v2 export - ${input.recipientLabel.slice(0, 80)}`,
      description: 'Ariadne Trace v2 service export placeholder for external editor media.',
      content_type: 'video',
      file_url: input.mediaUrl,
      platforms: ['ariadne'],
      tags: ['ariadne-v2', 'frame-v2'],
      status: 'archived',
    })
    .select('id')
    .single()
  if (error || !data?.id) throw new Error(error?.message || 'Could not create Ariadne content row')
  return data.id as string
}

async function uploadEmbeddedMp4(supabase: SupabaseClient, userId: string, exportId: string, buf: Buffer) {
  const bucket = process.env.ARIADNE_EXPORTS_BUCKET || 'ariadne-exports'
  const path = `${userId}/${exportId}.mp4`
  const { error } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) throw new Error(`Could not upload embedded MP4: ${error.message}`)
  const expiresIn = Number(process.env.ARIADNE_EXPORT_SIGNED_URL_TTL_SEC || 604800)
  const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (signedError || !data?.signedUrl) {
    throw new Error(`Could not sign embedded MP4 URL: ${signedError?.message || 'missing signed URL'}`)
  }
  return {
    path,
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  }
}

async function sendCallback(callbackUrl: unknown, payload: unknown) {
  if (typeof callbackUrl !== 'string' || !callbackUrl.trim()) return
  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}

export async function POST(request: NextRequest) {
  const endpoint = '/api/ariadne/embed-v2'
  const rawBody = await request.text()
  const parsedHeaders = parseServiceHeaders(request)
  if (!parsedHeaders.ok) return json({ error: parsedHeaders.error }, parsedHeaders.status)
  const verified = verifyServiceSignature({
    request,
    headers: parsedHeaders.headers,
    bodySha256: sha256Hex(rawBody),
  })
  if (!verified.ok) return json({ error: verified.error }, verified.status)
  const actorUserId = getServiceActorUserId(parsedHeaders.headers)
  if (!actorUserId) return json({ error: 'x-creatix-actor-user-id is required' }, 400)

  let body: ReturnType<typeof parseBody>
  try {
    body = parseBody(rawBody)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid JSON body' }, 400)
  }

  const supabase = getServiceSupabase()
  const exportId = randomUUID()
  const jobId = randomUUID()
  const idempotencyKey = parsedHeaders.headers.idempotencyKey || `${endpoint}:${actorUserId}:${body.payloadId}`

  const existing = await supabase
    .from('ariadne_exports')
    .select('id,payload_id,payload_manifest')
    .eq('user_id', actorUserId)
    .eq('payload_id', body.payloadId)
    .maybeSingle()
  if (existing.data) {
    const manifest = (existing.data.payload_manifest ?? {}) as Record<string, unknown>
    return json({
      ok: true,
      exportId: existing.data.id,
      payloadId: existing.data.payload_id,
      embeddedFileUrl: String(manifest.embeddedFileUrl ?? ''),
      expiresAt: String(manifest.expiresAt ?? new Date().toISOString()),
      algorithm: 'frame-v2',
    })
  }

  let contentId: string | null = null
  try {
    const original = await downloadMp4(body.mediaUrl)
    const beforeSha = sha256Hex(original)
    const plan = buildWatermarkEmbeddingPlan({ payloadId: body.payloadId })
    contentId = await ensureContentRow(supabase, {
      userId: actorUserId,
      mediaUrl: body.mediaUrl,
      recipientLabel: body.recipientLabel,
    })
    const { error: jobError } = await supabase.from('ariadne_v2_jobs').insert({
      id: jobId,
      user_id: actorUserId,
      content_id: contentId,
      recipient_key: body.recipientLabel,
      source: 'frame_export',
      status: 'processing',
      idempotency_key: idempotencyKey,
      pipeline_version: 'frame-v2',
      encoder_profile: 'ffmpeg-h264-rgb24',
    })
    if (jobError) throw new Error(jobError.message)

    const embedded = await embedFrameV2IntoMp4(original, plan)
    const uploaded = await uploadEmbeddedMp4(supabase, actorUserId, exportId, embedded.output)
    const responsePayload = {
      ok: true,
      exportId,
      payloadId: body.payloadId,
      embeddedFileUrl: uploaded.signedUrl,
      expiresAt: uploaded.expiresAt,
      algorithm: 'frame-v2' as const,
    }

    const { error: exportError } = await supabase.from('ariadne_exports').insert({
      id: exportId,
      user_id: actorUserId,
      content_id: contentId,
      recipient_key: body.recipientLabel,
      source: 'frame_export',
      algorithm_version: 'frame-v2',
      payload_id: body.payloadId,
      payload_manifest: {
        algorithm: 'frame-v2',
        embeddedFilePath: uploaded.path,
        embeddedFileUrl: uploaded.signedUrl,
        expiresAt: uploaded.expiresAt,
        mediaUrl: body.mediaUrl,
        service: parsedHeaders.headers.serviceName,
      },
      file_sha256_before: beforeSha,
      file_sha256_after: sha256Hex(embedded.output),
    })
    if (exportError) throw new Error(exportError.message)

    await supabase
      .from('ariadne_v2_jobs')
      .update({
        status: 'completed',
        frame_count: embedded.frameCount,
        embedded_windows: embedded.embeddedWindows,
        size_delta_bytes: embedded.sizeDeltaBytes,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await sendCallback(body.callbackUrl, responsePayload)
    return json(responsePayload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ariadne embed-v2 failed'
    if (contentId) {
      await supabase
        .from('ariadne_v2_jobs')
        .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
        .eq('id', jobId)
    }
    return json({ ok: false, error: message }, 500)
  }
}
