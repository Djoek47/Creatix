import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

const CONTENT_TYPES = new Set(['photo', 'video', 'message', 'ppv'])

/** Create a draft Creatix vault row (library item). */
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { title?: string; description?: string | null; content_type?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawType = typeof body.content_type === 'string' ? body.content_type.toLowerCase() : 'video'
  if (!CONTENT_TYPES.has(rawType)) {
    return NextResponse.json({ error: 'content_type must be photo, video, message, or ppv' }, { status: 400 })
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 500)
      : `New vault ${rawType}`
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim().slice(0, 4000)
      : null

  const { data, error } = await supabase
    .from('content')
    .insert({
      user_id: user.id,
      title,
      description,
      content_type: rawType,
      platforms: [],
      tags: [],
      status: 'draft',
      source_platform: 'creatix',
    })
    .select('id, title, content_type, status, source_platform, thumbnail_url, file_url, external_preview_url, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

/** List current user's vault rows (for picker UIs). */
export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase
    .from('content')
    .select(
      'id, title, content_type, status, thumbnail_url, file_url, vault_storage_path, external_preview_url, updated_at',
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  let { data, error } = await query

  if (error && /vault_storage_path|column/i.test(error.message || '')) {
    const fb = await supabase
      .from('content')
      .select(
        'id, title, content_type, status, thumbnail_url, file_url, external_preview_url, updated_at',
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    data = (fb.data ?? []).map((row) => ({ ...row, vault_storage_path: null }))
    error = fb.error
  }

  if (error) {
    const { data: fallback } = await supabase
      .from('content')
      .select('id, title, content_type, status, thumbnail_url, file_url, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    return NextResponse.json({ items: fallback || [] })
  }

  return NextResponse.json({ items: data || [] })
}
