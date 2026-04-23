import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

function parseCursor(raw: string | null): number {
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(1, Number.parseInt(searchParams.get('limit') || '25', 10)), 100)
  const cursor = parseCursor(searchParams.get('cursor'))
  const query = searchParams.get('query')?.trim() || ''
  const source = searchParams.get('source')?.trim() || ''
  const contentId = searchParams.get('contentId')?.trim() || ''

  let db = supabase
    .from('ariadne_exports')
    .select(
      'id, user_id, content_id, content_title, recipient_key, recipient_fan_id, recipient_platform, recipient_platform_fan_id, recipient_username, recipient_display_name, source, origin_message_id, origin_mass_batch_id, export_path, payload_id, algorithm_version, job_id, pipeline_version, encoder_profile, created_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(cursor, cursor + limit)

  if (source) db = db.eq('source', source)
  if (contentId) db = db.eq('content_id', contentId)
  if (query) {
    const safe = query.replace(/,/g, ' ')
    db = db.or(
      `recipient_key.ilike.%${safe}%,recipient_username.ilike.%${safe}%,recipient_display_name.ilike.%${safe}%,recipient_platform_fan_id.ilike.%${safe}%,content_title.ilike.%${safe}%,payload_id.ilike.%${safe}%`,
    )
  }

  const { data, error } = await db
  if (error) return NextResponse.json({ error: error.message || 'Failed to load exports' }, { status: 500 })

  const rows = Array.isArray(data) ? data : []
  const nextCursor = rows.length > limit ? String(cursor + limit) : null
  const pageRows = rows.slice(0, limit)

  return NextResponse.json({
    exports: pageRows,
    page: {
      limit,
      cursor: String(cursor),
      nextCursor,
    },
  })
}
