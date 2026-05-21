import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_HOSTS = ['www.circeetvenus.com', 'circeetvenus.com']

function isAllowedExportUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    /** Always union defaults so CREATIX_EXPORT_HOST_ALLOWLIST can add preview hosts without dropping production. */
    const extra = (process.env.CREATIX_EXPORT_HOST_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const allow = new Set([...DEFAULT_HOSTS, ...extra])
    if (!allow.has(u.hostname)) return false
    const path = u.pathname.replace(/\/+$/, '') || '/'
    return /\/api\/content\/vault\/[^/]+\/frame-export$/.test(path)
  } catch {
    return false
  }
}

/**
 * Exports to Creatix without POSTing the video through Creatix's serverless function
 * (avoids Vercel `FUNCTION_PAYLOAD_TOO_LARGE` / 413). Flow: JSON prepare → PUT to Supabase
 * signed URL → JSON complete. The browser never sees FRAME_EXPORT_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.FRAME_EXPORT_SECRET
  if (!secret || secret.length < 8) {
    return NextResponse.json(
      { error: 'FRAME_EXPORT_SECRET is not configured on this Frame deployment' },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const exportUrlRaw = formData.get('exportUrl')
  const exportUrl = typeof exportUrlRaw === 'string' ? exportUrlRaw.trim() : ''
  if (!exportUrl || !isAllowedExportUrl(exportUrl)) {
    return NextResponse.json({ error: 'Invalid or disallowed exportUrl' }, { status: 400 })
  }

  const exportTokenRaw = formData.get('exportToken')
  const exportToken = typeof exportTokenRaw === 'string' ? exportTokenRaw : null
  if (!exportToken) {
    return NextResponse.json({ error: 'Missing exportToken' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const prepareUrl = exportUrl.replace(/\/frame-export\/?$/, '/frame-export/prepare')
  const completeUrl = exportUrl.replace(/\/frame-export\/?$/, '/frame-export/complete')
  const mime = file.type || 'video/mp4'

  const prepRes = await fetch(prepareUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Frame-Export-Secret': secret,
    },
    body: JSON.stringify({
      exportToken,
      fileName: file.name || 'export.mp4',
      mimeType: mime,
      fileSize: file.size,
    }),
  })

  const prepJson = (await prepRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!prepRes.ok) {
    return NextResponse.json(prepJson, { status: prepRes.status })
  }

  const signedUrl = prepJson.signedUrl
  const path = prepJson.path
  if (typeof signedUrl !== 'string' || typeof path !== 'string') {
    return NextResponse.json({ error: 'Invalid prepare response from Creatix' }, { status: 502 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const putRes = await fetch(signedUrl, {
    method: 'PUT',
    body: buf,
    headers: { 'Content-Type': mime },
  })

  if (!putRes.ok) {
    const t = await putRes.text().catch(() => '')
    return NextResponse.json(
      { error: `Storage upload failed (${putRes.status}): ${t.slice(0, 400)}` },
      { status: 502 },
    )
  }

  const doneRes = await fetch(completeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Frame-Export-Secret': secret,
    },
    body: JSON.stringify({
      exportToken,
      path,
      mimeType: mime,
    }),
  })

  const text = await doneRes.text()
  const contentType = doneRes.headers.get('content-type') || 'application/json'

  return new NextResponse(text, {
    status: doneRes.status,
    headers: { 'Content-Type': contentType },
  })
}
