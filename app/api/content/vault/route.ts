import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

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
    data = fb.data
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
