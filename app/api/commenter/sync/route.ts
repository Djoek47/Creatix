import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { syncOnlyFansPostCommentsForUser } from '@/lib/commenter/sync-post-comments'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      postId?: string
      maxPosts?: number
      runAnalysis?: boolean
    }

    const result = await syncOnlyFansPostCommentsForUser(supabase, user.id, {
      postId: typeof body.postId === 'string' ? body.postId : undefined,
      maxPosts: typeof body.maxPosts === 'number' ? body.maxPosts : undefined,
      runAnalysis: body.runAnalysis !== false,
    })

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
