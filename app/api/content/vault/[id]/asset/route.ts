import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyAssetReadToken } from '@/lib/frame-vault-bridge'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'
import { applyFrameCorsHeaders } from '@/lib/cors-frame'

export const runtime = 'nodejs'

function withAssetCors(request: NextRequest, response: NextResponse): NextResponse {
  return applyFrameCorsHeaders(request, response)
}

/**
 * Authenticated proxy for vault video: Frame (or browsers) fetch this URL with ?t= token
 * instead of hitting CDN/origin directly (CORS + stable origin).
 */
export async function OPTIONS(request: NextRequest) {
  return withAssetCors(request, new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = request.nextUrl.searchParams.get('t')
  if (!token) {
    return withAssetCors(request, NextResponse.json({ error: 'Missing token' }, { status: 400 }))
  }

  const payload = verifyAssetReadToken(token)
  if (!payload || payload.contentId !== id) {
    return withAssetCors(request, NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 }))
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return withAssetCors(request, NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }))
  }

  const service = createServiceClient(url, key)
  const { data: row, error } = await service
    .from('content')
    .select('file_url, vault_storage_path')
    .eq('id', id)
    .eq('user_id', payload.userId)
    .maybeSingle()

  if (error || !row) {
    return withAssetCors(request, NextResponse.json({ error: 'Not found' }, { status: 404 }))
  }

  const range = request.headers.get('range')

  if (row.vault_storage_path) {
    const { data: signed, error: sErr } = await service.storage
      .from(VAULT_MEDIA_BUCKET)
      .createSignedUrl(row.vault_storage_path, 3600)
    if (sErr || !signed?.signedUrl) {
      return withAssetCors(request, NextResponse.json({ error: 'Failed to sign storage URL' }, { status: 500 }))
    }
    const upstreamHeaders: Record<string, string> = {}
    if (range) upstreamHeaders.Range = range
    const upstream = await fetch(signed.signedUrl, { headers: upstreamHeaders })
    const resHeaders = new Headers()
    const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']
    for (const h of passthrough) {
      const v = upstream.headers.get(h)
      if (v) resHeaders.set(h, v)
    }
    resHeaders.set('Cache-Control', 'private, max-age=300')
    return withAssetCors(
      request,
      new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders }),
    )
  }

  if (!row.file_url || !/^https?:\/\//i.test(row.file_url)) {
    return withAssetCors(request, NextResponse.json({ error: 'No media URL' }, { status: 404 }))
  }

  const upstreamHeaders: Record<string, string> = {}
  if (range) upstreamHeaders.Range = range

  const upstream = await fetch(row.file_url, { headers: upstreamHeaders })
  const resHeaders = new Headers()
  const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']
  for (const h of passthrough) {
    const v = upstream.headers.get(h)
    if (v) resHeaders.set(h, v)
  }
  resHeaders.set('Cache-Control', 'private, max-age=300')

  return withAssetCors(
    request,
    new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    }),
  )
}
