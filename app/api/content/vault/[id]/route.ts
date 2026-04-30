import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'

const SPOILER_LEVELS = new Set(['none', 'mild', 'explicit'])

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const storagePath = (row as { vault_storage_path?: string | null }).vault_storage_path?.trim()
  if (storagePath) {
    const { error: rmErr } = await service.storage.from(VAULT_MEDIA_BUCKET).remove([storagePath])
    if (rmErr) {
      console.warn('[vault DELETE] storage remove failed', rmErr.message)
    }
  }

  const { error: delErr } = await service.from('content').delete().eq('id', id).eq('user_id', user.id)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') patch.title = body.title.slice(0, 500)
  if (typeof body.description === 'string' || body.description === null) {
    patch.description = body.description === null ? null : String(body.description).slice(0, 4000)
  }
  if (typeof body.sales_notes === 'string' || body.sales_notes === null) {
    patch.sales_notes = body.sales_notes === null ? null : String(body.sales_notes).slice(0, 8000)
  }
  if (Array.isArray(body.teaser_tags)) {
    patch.teaser_tags = body.teaser_tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 40)
  }
  if (typeof body.spoiler_level === 'string') {
    const s = body.spoiler_level.toLowerCase()
    if (SPOILER_LEVELS.has(s)) patch.spoiler_level = s
  }

  const { data, error } = await supabase
    .from('content')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(
      'id, title, description, content_type, status, thumbnail_url, file_url, sales_notes, teaser_tags, spoiler_level, source_platform, external_post_id, external_preview_url',
    )
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ content: data })
}
