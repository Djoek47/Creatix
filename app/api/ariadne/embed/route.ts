import { NextRequest, NextResponse } from 'next/server'
import { applyFrameCorsHeaders, frameCorsOptions } from '@/lib/cors-frame'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { verifyExportToken } from '@/lib/frame-vault-bridge'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import {
  createAriadnePayload,
  embedAppendV1,
  sha256Hex,
} from '@/lib/ariadne-embed'
import { vaultExportObjectPath, VAULT_MEDIA_BUCKET, VAULT_EXPORT_MAX_BYTES } from '@/lib/frame-vault-media'

export const runtime = 'nodejs'

export function OPTIONS(request: NextRequest) {
  return frameCorsOptions(request)
}

/** Cap for full-file read in one request (serverless); tune with your deployment limits. */
const ARIADNE_EMBED_MAX_BYTES = Math.min(80 * 1024 * 1024, VAULT_EXPORT_MAX_BYTES)

/**
 * POST JSON: { contentId, recipientKey, source?: 'vault_standalone' | 'frame_export' }
 * Downloads vault video, appends Ariadne append-v1 marker, re-uploads, updates content row.
 */
export async function POST(request: NextRequest) {
  const jc = (data: unknown, status: number) => applyFrameCorsHeaders(request, NextResponse.json(data, { status }))

  let body: {
    contentId?: string
    recipientKey?: string
    source?: 'vault_standalone' | 'frame_export'
    /** When set (OnlyFans), recipientKey defaults to onlyfans:{id} if omitted */
    platformFanId?: string
    platform?: string
  }
  try {
    body = await request.json()
  } catch {
    return jc({ error: 'Invalid JSON' }, 400)
  }

  const contentId = typeof body.contentId === 'string' ? body.contentId : ''
  const source = body.source === 'frame_export' ? 'frame_export' : 'vault_standalone'
  const platformFanId =
    typeof body.platformFanId === 'string' && body.platformFanId.trim()
      ? body.platformFanId.trim()
      : ''
  const platform =
    typeof body.platform === 'string' && body.platform.trim() ? body.platform.trim().toLowerCase() : ''
  let recipientKey = typeof body.recipientKey === 'string' ? body.recipientKey.trim() : ''

  if (platformFanId && !recipientKey) {
    const pf = platform || 'onlyfans'
    recipientKey = `${pf}:${platformFanId}`
  }

  if (!contentId || !recipientKey) {
    return jc(
      { error: 'contentId is required, and either recipientKey or platformFanId (chat fan) must be provided' },
      400,
    )
  }

  const supabase = await createRouteHandlerClient(request)
  let userId: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const tok = authHeader.slice(7).trim()
    const p = verifyExportToken(tok)
    if (p && p.contentId === contentId) userId = p.userId
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!userId && user) userId = user.id
  if (!userId) {
    return jc({ error: 'Unauthorized' }, 401)
  }

  const toolCost = getCreditsForToolId('ariadne-trace')
  const gate = await hasEnoughAiCredits(supabase, userId, toolCost)
  if (!gate.ok) {
    return jc(
      { error: 'Insufficient AI credits', code: 'ai_credits_exhausted', used: gate.used, limit: gate.limit },
      402,
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return jc({ error: 'Server misconfiguration' }, 500)
  }

  const service = createServiceClient(url, key)

  const { data: row, error: fetchErr } = await service
    .from('content')
    .select('id, user_id, content_type, file_url, vault_storage_path')
    .eq('id', contentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !row) {
    return jc({ error: 'Not found' }, 404)
  }

  const ct = String(row.content_type || '').toLowerCase()
  if (ct !== 'video' && !ct.includes('video')) {
    return jc({ error: 'Ariadne Trace applies to video content' }, 400)
  }

  let buf: Buffer
  try {
    if (row.vault_storage_path) {
      const { data: dl, error: dErr } = await service.storage.from(VAULT_MEDIA_BUCKET).download(row.vault_storage_path)
      if (dErr || !dl) {
        return jc({ error: dErr?.message || 'Could not download from vault storage' }, 500)
      }
      buf = Buffer.from(await dl.arrayBuffer())
    } else if (row.file_url && /^https?:\/\//i.test(row.file_url)) {
      const r = await fetch(row.file_url)
      if (!r.ok) {
        return jc({ error: 'Could not fetch video URL' }, 502)
      }
      buf = Buffer.from(await r.arrayBuffer())
    } else {
      return jc({ error: 'No downloadable video on this item' }, 400)
    }
  } catch (e) {
    return jc({ error: e instanceof Error ? e.message : 'Download failed' }, 500)
  }

  if (buf.length > ARIADNE_EMBED_MAX_BYTES) {
    return jc(
      { error: `Video too large for Ariadne embed in this deployment (max ${ARIADNE_EMBED_MAX_BYTES} bytes)` },
      413,
    )
  }

  let payload
  try {
    payload = createAriadnePayload({
      recipientKey,
      contentId,
      userId: userId,
    })
  } catch (e) {
    return jc(
      { error: e instanceof Error ? e.message : 'ARIADNE_SECRET / FRAME_BRIDGE_SECRET not configured' },
      503,
    )
  }

  const before = sha256Hex(buf)
  const out = embedAppendV1(buf, payload)
  const after = sha256Hex(out)

  const path = vaultExportObjectPath(userId, contentId, `ariadne-${payload.payloadId}.mp4`)
  const { error: upErr } = await service.storage.from(VAULT_MEDIA_BUCKET).upload(path, out, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (upErr) {
    return jc({ error: upErr.message || 'Upload failed' }, 500)
  }

  const signedSeconds = 60 * 24 * 60 * 60
  const { data: signed, error: signErr } = await service.storage.from(VAULT_MEDIA_BUCKET).createSignedUrl(path, signedSeconds)
  if (signErr || !signed?.signedUrl) {
    return jc({ error: signErr?.message || 'Could not sign URL' }, 500)
  }

  const exportRow: Record<string, unknown> = {
    user_id: userId,
    content_id: contentId,
    recipient_key: recipientKey,
    source,
    algorithm_version: 'append-v1',
    payload_id: payload.payloadId,
    payload_manifest: payload as unknown as Record<string, unknown>,
    file_sha256_before: before,
    file_sha256_after: after,
  }
  if (platformFanId) {
    exportRow.platform = platform || 'onlyfans'
    exportRow.platform_fan_id = platformFanId
  }

  const { error: insErr } = await service.from('ariadne_exports').insert(exportRow)

  if (insErr) {
    if (/platform_fan_id|column .* does not exist/i.test(insErr.message)) {
      return jc(
        { error: 'Database missing fan columns on ariadne_exports. Run scripts/077_ariadne_exports_fan_columns.sql.' },
        { status: 503 },
      )
    }
    return jc({ error: insErr.message || 'Could not save Ariadne record' }, 500)
  }

  const patch = {
    file_url: signed.signedUrl,
    vault_storage_path: path,
    updated_at: new Date().toISOString(),
  }
  const { error: updErr } = await service.from('content').update(patch).eq('id', contentId).eq('user_id', userId)
  if (updErr) {
    return jc({ error: updErr.message || 'Could not update content' }, 500)
  }

  const debit = await consumeAiCredits(supabase, userId, toolCost)
  if (!debit.ok) {
    return jc({ error: 'Credit debit failed after embed' }, 500)
  }

  return jc(
    {
      success: true,
      payloadId: payload.payloadId,
      algorithmVersion: 'append-v1',
      downloadUrl: signed.signedUrl,
      creditsCharged: toolCost,
    },
    200,
  )
}
