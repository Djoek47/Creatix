import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveVaultExportUserId } from '@/lib/frame-vault-export-auth'
import { finalizeVaultExportUpload } from '@/lib/frame-vault-export-finalize'
import { isAllowedVaultVideoMime } from '@/lib/frame-vault-media'

export const runtime = 'nodejs'

type CompleteBody = {
  exportToken?: string | null
  path?: string
  mimeType?: string
  title?: string | null
}

/**
 * JSON-only: confirms Storage upload and updates `content` (same outcome as multipart POST).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  let body: CompleteBody
  try {
    body = (await request.json()) as CompleteBody
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const storagePath = typeof body.path === 'string' ? body.path.trim() : ''
  if (!storagePath) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  const mime = typeof body.mimeType === 'string' && body.mimeType.trim() ? body.mimeType.trim() : 'video/mp4'
  if (!isAllowedVaultVideoMime(mime)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = resolveVaultExportUserId(request, id, body, user?.id ?? null)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const service = createServiceClient(url, key)

  const result = await finalizeVaultExportUpload(service, {
    userId,
    contentId: id,
    storagePath,
    mime,
    title: body.title,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    content: result.content,
    downloadUrl: result.downloadUrl,
    signedUrlExpiresInSec: result.signedUrlExpiresInSec,
  })
}
