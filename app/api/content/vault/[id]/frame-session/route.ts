import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createAssetReadToken, createExportToken } from '@/lib/frame-vault-bridge'
import { getAppUrlFromRequest } from '@/lib/site-url'

function isVideoContentType(ct: string | null | undefined): boolean {
  if (!ct) return false
  const c = ct.toLowerCase()
  return c === 'video' || c.includes('video')
}

function hasPlayableMedia(fileUrl: string | null | undefined, storagePath: string | null | undefined): boolean {
  if (storagePath && storagePath.length > 0) return true
  if (!fileUrl) return false
  return /^https?:\/\//i.test(fileUrl.trim())
}

function editorLaunchUrl(base: string, params: Record<string, string>) {
  const query = new URLSearchParams(params)
  return `${base}/editor?${query.toString()}`
}

/**
 * Start the in-Creatix editor bridge: signed asset proxy URL + export token for save-back.
 * Requires authenticated user who owns the content row.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!process.env.FRAME_BRIDGE_SECRET || process.env.FRAME_BRIDGE_SECRET.length < 16) {
    return NextResponse.json(
      { error: 'FRAME_BRIDGE_SECRET is not configured (min 16 characters). See docs/operators/frame-deployment.md.' },
      { status: 503 },
    )
  }
  const supabase = await createRouteHandlerClient(_request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let { data: row, error } = await supabase
    .from('content')
    .select('id, user_id, title, content_type, file_url, vault_storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error && /vault_storage_path|column/i.test(error.message || '')) {
    const fb = await supabase
      .from('content')
      .select('id, user_id, title, content_type, file_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    row = fb.data as typeof row
    error = fb.error
  }

  if (error || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const storagePath = (row as { vault_storage_path?: string | null }).vault_storage_path

  if (!isVideoContentType(row.content_type)) {
    return NextResponse.json({ error: 'Markit editing is only available for video items' }, { status: 400 })
  }

  if (!hasPlayableMedia(row.file_url, storagePath)) {
    return NextResponse.json(
      {
        error:
          'No video file on this item. Add a video file URL or upload a replacement first (OnlyFans-linked posts often have preview only).',
      },
      { status: 400 },
    )
  }

  const base = getAppUrlFromRequest(_request)
  const assetToken = createAssetReadToken(id, user.id, 3600)
  const exportToken = createExportToken(id, user.id, 7200)
  const assetProxyUrl = `${base}/api/content/vault/${id}/asset?t=${encodeURIComponent(assetToken)}`
  const exportUrl = `${base}/api/content/vault/${id}/frame-export`
  const frameBase = base
  const frameLaunchUrl = editorLaunchUrl(frameBase, {
    importUrl: assetProxyUrl,
    exportUrl,
    exportToken,
    contentId: id,
    title: row.title || 'Creatix vault video',
  })

  const ariadneEmbedApiUrl = `${base}/api/ariadne/embed`
  const frameAssistApiUrl = `${base}/api/frame/ai/assist`
  const exportPrepareUrl = exportUrl.replace(/\/frame-export\/?$/, '/frame-export/prepare')
  const exportCompleteUrl = exportUrl.replace(/\/frame-export\/?$/, '/frame-export/complete')

  return NextResponse.json({
    contentId: id,
    assetProxyUrl,
    exportToken,
    exportUrl,
    exportPrepareUrl,
    exportCompleteUrl,
    ariadneEmbedApiUrl,
    frameAssistApiUrl,
    frameBaseUrl: frameBase || null,
    frameLaunchUrl,
    markitBaseUrl: frameBase || null,
    markitLaunchUrl: frameLaunchUrl,
    frameConfigured: true,
    markitConfigured: true,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    instructions: `Open markitLaunchUrl to launch the same-domain Creatix editor. The editor receives importUrl, exportUrl, and exportToken, imports the vault media, and can save an export back to this vault item. Large video exports can use exportPrepareUrl/exportCompleteUrl. Optional: POST JSON to ariadneEmbedApiUrl with { contentId, recipientKey, source: "frame_export" }. Editor AI Assist: POST frameAssistApiUrl with { messages } and Authorization: Bearer <exportToken>.`,
  })
}
