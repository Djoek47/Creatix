import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyExportToken } from '@/lib/frame-vault-bridge'
import {
  isAllowedVaultVideoMime,
  vaultExportObjectPath,
  VAULT_EXPORT_MAX_BYTES,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'

export const runtime = 'nodejs'

/**
 * Upload edited video: either Frame service (X-Frame-Export-Secret + exportToken) or logged-in user (session).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const serviceSecret = process.env.FRAME_EXPORT_SECRET
  const headerSecret = request.headers.get('x-frame-export-secret')

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  if (file.size > VAULT_EXPORT_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const exportTokenRaw = formData.get('exportToken')
  const exportToken = typeof exportTokenRaw === 'string' ? exportTokenRaw : null

  let userId: string | null = null

  if (serviceSecret && headerSecret === serviceSecret && exportToken) {
    const payload = verifyExportToken(exportToken)
    if (!payload || payload.contentId !== id) {
      return NextResponse.json({ error: 'Invalid export token' }, { status: 403 })
    }
    userId = payload.userId
  } else {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mime = file.type || 'application/octet-stream'
  if (!isAllowedVaultVideoMime(mime)) {
    return NextResponse.json({ error: 'Unsupported file type; use a video file' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const service = createServiceClient(url, key)

  const { data: row, error: fetchErr } = await service
    .from('content')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
    return NextResponse.json({ error: (upErr.message || 'Upload failed') + hint }, { status: 500 })
  }

  const signedSeconds = 60 * 24 * 60 * 60 // 60 days
  const { data: signed, error: signErr } = await service.storage
    .from(VAULT_MEDIA_BUCKET)
    .createSignedUrl(path, signedSeconds)

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || 'Could not sign URL' }, { status: 500 })
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
    return NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    content: updated,
    downloadUrl: signed.signedUrl,
    signedUrlExpiresInSec: signedSeconds,
  })
}
