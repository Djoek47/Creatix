import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  DEFAULT_VAULT_USER_QUOTA_MB,
  isAllowedVaultPhotoMime,
  resolveVaultUserQuotaBytes,
  vaultExportObjectPath,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'
import { sumVaultMediaUsageBytes, vaultObjectSizeBytes } from '@/lib/vault-storage-usage'

/** Max single photo (keep well under export cap; photos rarely need 500MB). */
const PHOTO_MAX_BYTES = 50 * 1024 * 1024

export const runtime = 'nodejs'

/** Session-authenticated photo upload for vault `content` rows with `content_type === 'photo'`. */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

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

  if (file.size > PHOTO_MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 50 MB)' }, { status: 413 })
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mime = file.type || 'application/octet-stream'
  if (!isAllowedVaultPhotoMime(mime)) {
    return NextResponse.json({ error: 'Use JPEG, PNG, WebP, or GIF' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const service = createServiceClient(url, key)

  const { data: row, error: fetchErr } = await service
    .from('content')
    .select('id,content_type,vault_storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ct = String((row as { content_type?: string }).content_type || '').toLowerCase()
  if (ct !== 'photo') {
    return NextResponse.json({ error: 'This item is not a photo draft' }, { status: 400 })
  }

  const quotaBytes = resolveVaultUserQuotaBytes()
  const currentPath = (row as { vault_storage_path?: string | null }).vault_storage_path ?? null

  const usageResult = await sumVaultMediaUsageBytes(service, user.id)
  if (usageResult.error) {
    return NextResponse.json({ error: usageResult.error || 'Could not verify vault usage' }, { status: 500 })
  }

  const existingBytes = currentPath ? await vaultObjectSizeBytes(service, currentPath) : 0
  const projectedBytes = usageResult.bytes - existingBytes + file.size
  if (projectedBytes > quotaBytes) {
    return NextResponse.json(
      {
        error: `Vault storage limit reached (${Math.round(quotaBytes / (1024 * 1024))} MB per user).`,
        code: 'vault_storage_limit_reached',
        quotaBytes,
        recommendedPerUserMb: DEFAULT_VAULT_USER_QUOTA_MB,
      },
      { status: 413 },
    )
  }

  const path = vaultExportObjectPath(user.id, id, file.name || 'photo.jpg')
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await service.storage.from(VAULT_MEDIA_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: true,
  })

  if (upErr) {
    return NextResponse.json({ error: upErr.message || 'Upload failed' }, { status: 500 })
  }

  const signedSeconds = 60 * 24 * 60 * 60
  const { data: signed, error: signErr } = await service.storage
    .from(VAULT_MEDIA_BUCKET)
    .createSignedUrl(path, signedSeconds)

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message || 'Could not sign URL' }, { status: 500 })
  }

  const signedUrl = signed.signedUrl
  const patch: Record<string, unknown> = {
    file_url: signedUrl,
    thumbnail_url: signedUrl,
    vault_storage_path: path,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error: updErr } = await service
    .from('content')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, file_url, thumbnail_url, vault_storage_path, updated_at')
    .maybeSingle()

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 })
  }

  if (currentPath && currentPath !== path) {
    void service.storage.from(VAULT_MEDIA_BUCKET).remove([currentPath])
  }

  return NextResponse.json({
    success: true,
    content: updated,
    signedUrlExpiresInSec: signedSeconds,
  })
}
