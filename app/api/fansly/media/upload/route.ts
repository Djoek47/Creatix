import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

export const runtime = 'nodejs'

/**
 * ApiFansly processes uploads in a background job; `FanslyAPI.uploadMediaWait` polls up to 120s by default.
 * Default Vercel function limits are shorter — raise this and `uploadMediaWait(..., { timeoutMs })` together if you need longer video jobs.
 * @see https://vercel.com/docs/functions/configuring-functions/duration
 */
export const maxDuration = 180

function fanslyAccountIdFromRow(row: {
  access_token?: string | null
  platform_user_id?: string | null
}): string | null {
  const a =
    (row.access_token != null && String(row.access_token).trim() !== ''
      ? String(row.access_token).trim()
      : null) ??
    (row.platform_user_id != null && String(row.platform_user_id).trim() !== ''
      ? String(row.platform_user_id).trim()
      : null)
  return a
}

/**
 * POST: Upload media for Fansly DMs / mass messages (vault processing is async upstream).
 *
 * **Requires:** `FANSLY_API_KEY` on the server and a **connected** Fansly account for the signed-in user.
 * Large or first-time assets can take **tens of seconds** while ApiFansly completes the job (this handler waits synchronously).
 *
 * - multipart/form-data: field `file` (binary).
 * - application/json: `{ "file_url": "https://..." }` — public URL fetched server-side, then uploaded
 *   as multipart to ApiFansly (same pattern as OnlyFans large-file handoff via Blob).
 *
 * Returns `{ id, url?, type? }` where `id` is the Fansly **media** id for `mediaIds` on send.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    const accountId = connection ? fanslyAccountIdFromRow(connection) : null
    if (!accountId) {
      return NextResponse.json({ error: 'Fansly not connected' }, { status: 400 })
    }

    const api = createFanslyAPI()
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = (await req.json().catch(() => ({}))) as { file_url?: string }
      const fileUrl = typeof body.file_url === 'string' ? body.file_url.trim() : ''
      if (!fileUrl || !/^https:\/\//i.test(fileUrl)) {
        return NextResponse.json(
          { error: 'JSON body must include file_url (https URL), or use multipart form with file field.' },
          { status: 400 },
        )
      }
      const upstream = await fetch(fileUrl, { redirect: 'follow', signal: AbortSignal.timeout(120_000) })
      if (!upstream.ok) {
        return NextResponse.json(
          { error: `Could not download file_url (${upstream.status})` },
          { status: 400 },
        )
      }
      const buf = await upstream.arrayBuffer()
      const mime = upstream.headers.get('content-type') || 'application/octet-stream'
      const blob = new Blob([buf], { type: mime })
      let name = 'upload.bin'
      try {
        const u = new URL(fileUrl)
        const seg = u.pathname.split('/').filter(Boolean).pop()
        if (seg) name = decodeURIComponent(seg.split('?')[0] || 'upload.bin')
      } catch {
        /* keep default */
      }
      const result = await api.uploadMediaWait(accountId, blob, name)
      return NextResponse.json(result)
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file in form (field: file)' }, { status: 400 })
    }

    const result = await api.uploadMediaWait(accountId, file, file.name || 'upload.bin')
    return NextResponse.json(result)
  } catch (err) {
    console.error('[fansly/media/upload]', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
