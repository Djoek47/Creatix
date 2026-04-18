import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyExportToken } from '@/lib/frame-vault-bridge'
import { applyFrameCorsHeaders } from '@/lib/cors-frame'
import {
  isAllowedVaultVideoMime,
  vaultExportObjectPath,
  VAULT_EXPORT_MAX_BYTES,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'

export const runtime = 'nodejs'

function withCors(request: NextRequest, res: NextResponse): NextResponse {
  return applyFrameCorsHeaders(request, res)
}

/**
 * Upload edited video:
 * - Markit/Frame **browser**: `exportToken` only (HMAC) — large files bypass Markit's Vercel body limit.
 * - Server proxy: `X-Frame-Export-Secret` + `exportToken` (legacy).
 * - Logged-in creator: session cookie, no token.
 */
export async function OPTIONS(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 204 }))
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const serviceSecret = process.env.FRAME_EXPORT_SECRET
  const headerSecret = request.headers.get('x-frame-export-secret')

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return withCors(request, NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 }))
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return withCors(request, NextResponse.json({ error: 'Invalid body' }, { status: 400 }))
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return withCors(request, NextResponse.json({ error: 'Missing file' }, { status: 400 }))
  }

  if (file.size > VAULT_EXPORT_MAX_BYTES) {
    return withCors(request, NextResponse.json({ error: 'File too large' }, { status: 413 }))
  }

  const exportTokenRaw = formData.get('exportToken')
  const exportToken = typeof exportTokenRaw === 'string' ? exportTokenRaw : null

  const payloadFromToken = exportToken ? verifyExportToken(exportToken) : null

  let userId: string | null = null

  const hasServiceAuth = Boolean(serviceSecret && headerSecret === serviceSecret && exportToken)

  if (hasServiceAuth) {
    if (!payloadFromToken || payloadFromToken.contentId !== id) {
      return withCors(request, NextResponse.json({ error: 'Invalid export token' }, { status: 403 }))
    }
    userId = payloadFromToken.userId
  } else if (exportToken) {
    if (!payloadFromToken || payloadFromToken.contentId !== id) {
      return withCors(request, NextResponse.json({ error: 'Invalid export token' }, { status: 403 }))
    }
    userId = payloadFromToken.userId
  } else {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    userId = user.id
  }

  if (!userId) {
    return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const mime = file.type || 'application/octet-stream'
  if (!isAllowedVaultVideoMime(mime)) {
    return withCors(request, NextResponse.json({ error: 'Unsupported file type; use a video file' }, { status: 400 }))
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return withCors(request, NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }))
  }

  const service = createServiceClient(url, key)

  const { data: row, error: fetchErr } = await service
    .from('content')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !row) {
    return withCors(request, NextResponse.json({ error: 'Not found' }, { status: 404 }))
  }

  const path = vaultExportObjectPath(userId, id, file.name || 'export.mp4')
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await service.storage.from(VAULT_MEDIA_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: true,
  })

  if (upErr) {
    const hint =
      /not exist|Bucket not found/i.test(upErr.message || '')
        ? ' Create the vault-media bucket (scripts/075_vault_media_bucket.sql).'
        : ''
    return withCors(
      request,
      NextResponse.json({ error: (upErr.message || 'Upload failed') + hint }, { status: 500 }),
    )
  }

  const signedSeconds = 60 * 24 * 60 * 60 // 60 days
  const { data: signed, error: signErr } = await service.storage
    .from(VAULT_MEDIA_BUCKET)
    .createSignedUrl(path, signedSeconds)

  if (signErr || !signed?.signedUrl) {
    return withCors(request, NextResponse.json({ error: signErr?.message || 'Could not sign URL' }, { status: 500 }))
  }

  const patch: Record<string, unknown> = {
    file_url: signed.signedUrl,
    vault_storage_path: path,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error: updErr } = await service
    .from('content')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, file_url, vault_storage_path, updated_at')
    .maybeSingle()

  if (updErr || !updated) {
    return withCors(request, NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 }))
  }

  return withCors(
    request,
    NextResponse.json({
      success: true,
      content: updated,
      downloadUrl: signed.signedUrl,
      signedUrlExpiresInSec: signedSeconds,
    }),
  )
}
