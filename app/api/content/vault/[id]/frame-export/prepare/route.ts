import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveVaultExportUserId } from '@/lib/frame-vault-export-auth'
import { vaultExportExistingBytes } from '@/lib/frame-vault-export-finalize'
import {
  DEFAULT_VAULT_USER_QUOTA_MB,
  isAllowedVaultVideoMime,
  resolveVaultUserQuotaBytes,
  vaultExportObjectPath,
  VAULT_EXPORT_MAX_BYTES,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'
import { sumVaultMediaUsageBytes } from '@/lib/vault-storage-usage'

export const runtime = 'nodejs'

type PrepareBody = {
  exportToken?: string | null
  fileName?: string
  mimeType?: string
  fileSize?: number
}

/**
 * JSON-only: returns a Supabase signed upload URL so the browser (or Frame server)
 * can PUT large videos directly to Storage — avoids Vercel `FUNCTION_PAYLOAD_TOO_LARGE` (413).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  let body: PrepareBody
  try {
    body = (await request.json()) as PrepareBody
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = resolveVaultExportUserId(request, id, body, user?.id ?? null)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fileName = typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : 'export.mp4'
  const mime = typeof body.mimeType === 'string' && body.mimeType.trim() ? body.mimeType.trim() : 'video/mp4'
  const fileSize = typeof body.fileSize === 'number' && Number.isFinite(body.fileSize) ? Math.floor(body.fileSize) : 0

  if (fileSize <= 0) {
    return NextResponse.json({ error: 'fileSize must be a positive number (bytes)' }, { status: 400 })
  }
  if (fileSize > VAULT_EXPORT_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }
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
    .select('id,vault_storage_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const quotaBytes = resolveVaultUserQuotaBytes()
  const currentPath = (row as { vault_storage_path?: string | null }).vault_storage_path ?? null

  const usageResult = await sumVaultMediaUsageBytes(service, userId)
  if (usageResult.error) {
    return NextResponse.json({ error: usageResult.error || 'Could not verify vault usage' }, { status: 500 })
  }
  let usageBytes = usageResult.bytes
  const existingBytes = await vaultExportExistingBytes(service, currentPath)
  const projectedBytes = usageBytes - existingBytes + fileSize
  if (projectedBytes > quotaBytes) {
    return NextResponse.json(
      {
        error: `Vault storage limit reached (${Math.round(quotaBytes / (1024 * 1024))} MB per user).`,
        code: 'vault_storage_limit_reached',
        usageBytes,
        quotaBytes,
        recommendedPerUserMb: DEFAULT_VAULT_USER_QUOTA_MB,
      },
      { status: 413 },
    )
  }

  const path = vaultExportObjectPath(userId, id, fileName)

  const { data: signUp, error: signErr } = await service.storage
    .from(VAULT_MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: true })

  if (signErr || !signUp?.signedUrl || !signUp.token) {
    const hint =
      /not exist|Bucket not found/i.test(signErr?.message || '')
        ? ' Create the vault-media bucket (scripts/075_vault_media_bucket.sql).'
        : ''
    return NextResponse.json({ error: (signErr?.message || 'Could not create upload URL') + hint }, { status: 500 })
  }

  return NextResponse.json({
    path: signUp.path,
    token: signUp.token,
    signedUrl: signUp.signedUrl,
    bucket: VAULT_MEDIA_BUCKET,
    instructions:
      'PUT the raw video bytes to signedUrl with header Content-Type matching mimeType. Then POST /frame-export/complete with { path, mimeType }.',
  })
}
