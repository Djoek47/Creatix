import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { processPlatformPostCommentById } from '@/lib/commenter/process-comment'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { commentId?: string; force?: boolean }
    const commentId = typeof body.commentId === 'string' ? body.commentId.trim() : ''
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 })
    }

    const { data: row, error: ownErr } = await supabase
      .from('platform_post_comments')
      .select('id')
      .eq('id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownErr) return NextResponse.json({ error: ownErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase.from('platform_post_comments').update({ analysis_status: 'pending' }).eq('id', commentId)

    const result = await processPlatformPostCommentById(supabase, commentId, {
      bypassCreatorResourceSkip: body.force === true,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, skipped: result.skipped === true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Analyze failed' },
      { status: 500 },
    )
  }
}
