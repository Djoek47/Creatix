import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { commentId?: string; text?: string }
    const commentId = typeof body.commentId === 'string' ? body.commentId.trim() : ''
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('platform_post_comments')
      .update({
        creator_reply_text: text.slice(0, 4000),
        creator_reply_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Save failed' },
      { status: 500 },
    )
  }
}
