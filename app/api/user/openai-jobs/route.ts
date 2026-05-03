import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import type { NextRequest } from 'next/server'

/** List recent OpenAI background jobs for the signed-in creator (RLS). */
export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, Math.max(1, Math.floor(Number(searchParams.get('limit') ?? '20'))))

  const { data, error } = await supabase
    .from('openai_jobs')
    .select(
      'id, feature, model, status, error_message, result_summary, created_at, completed_at, usage_total_tokens',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ jobs: data ?? [] })
}
