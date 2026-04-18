import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export type AriadneExportRow = {
  id: string
  created_at: string
  recipient_key: string
  platform: string | null
  platform_fan_id: string | null
  payload_id: string
  content_id: string
  algorithm_version: string
  content?: { title: string | null } | null
}

/**
 * GET ?platformFanId= — list Ariadne exports for the current user, optional filter by OnlyFans fan id.
 */
export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const platformFanId = searchParams.get('platformFanId')?.trim() || ''

  let q = supabase
    .from('ariadne_exports')
    .select('id, created_at, recipient_key, platform, platform_fan_id, payload_id, content_id, algorithm_version')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (platformFanId) {
    q = q.eq('platform', 'onlyfans').eq('platform_fan_id', platformFanId)
  }

  const { data: rows, error } = await q

  if (error) {
    if (/column .* does not exist|platform_fan_id/i.test(error.message)) {
      return NextResponse.json(
        { error: 'Run migration scripts/077_ariadne_exports_fan_columns.sql for fan-linked exports.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = (rows ?? []) as Omit<AriadneExportRow, 'content'>[]
  const contentIds = [...new Set(list.map((r) => r.content_id).filter(Boolean))]
  let titles: Record<string, string | null> = {}
  if (contentIds.length > 0) {
    const { data: contentRows } = await supabase
      .from('content')
      .select('id, title')
      .eq('user_id', user.id)
      .in('id', contentIds)
    for (const c of contentRows ?? []) {
      const row = c as { id: string; title: string | null }
      titles[row.id] = row.title
    }
  }

  const exports: AriadneExportRow[] = list.map((r) => ({
    ...r,
    content: { title: titles[r.content_id] ?? null },
  }))

  return NextResponse.json({ exports })
}
