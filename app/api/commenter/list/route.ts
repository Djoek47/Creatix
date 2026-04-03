import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export const maxDuration = 60

export type CommenterListMeta = {
  onlyfans_connected: boolean
  /** Only set when the comment list is empty and OnlyFans is connected (from API). */
  feed_post_count: number | null
  /** Posts that report at least one comment (OnlyFans API). */
  posts_with_comments: number | null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 40, 1), 80)

    const { data: rows, error } = await supabase
      .from('platform_post_comments')
      .select(
        `
        id,
        platform,
        platform_post_id,
        platform_fan_id,
        fan_username,
        fan_display_name,
        comment_text,
        source,
        received_at,
        analysis_status,
        creator_reply_text,
        creator_reply_at
      `,
      )
      .eq('user_id', user.id)
      .order('received_at', { ascending: false })
      .limit(limit)

    if (error) {
      const msg = error.message.includes('relation') ? 'Commenter tables missing. Run migration 047_commenter.sql.' : error.message
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const list = rows ?? []
    const ids = list.map((r) => (r as { id: string }).id).filter(Boolean)
    let analyses: Record<string, unknown> = {}
    let suggestions: Record<string, unknown[]> = {}

    if (ids.length > 0) {
      const [{ data: anRows, error: anErr }, { data: sgRows, error: sgErr }] = await Promise.all([
        supabase.from('post_comment_analyses').select('comment_id, analysis_json, model, created_at').in('comment_id', ids),
        supabase
          .from('post_comment_reply_suggestions')
          .select('comment_id, voice, suggestion_text, created_at')
          .in('comment_id', ids),
      ])
      if (anErr && !anErr.message.includes('relation')) {
        return NextResponse.json({ error: anErr.message }, { status: 500 })
      }
      if (sgErr && !sgErr.message.includes('relation')) {
        return NextResponse.json({ error: sgErr.message }, { status: 500 })
      }
      for (const a of anRows ?? []) {
        const cid = (a as { comment_id: string }).comment_id
        analyses[cid] = a
      }
      for (const s of sgRows ?? []) {
        const cid = (s as { comment_id: string }).comment_id
        if (!suggestions[cid]) suggestions[cid] = []
        suggestions[cid].push(s)
      }
    }

    const comments = list.map((r) => {
      const id = (r as { id: string }).id
      return {
        ...r,
        analysis: analyses[id] ?? null,
        reply_suggestions: suggestions[id] ?? [],
      }
    })

    const meta: CommenterListMeta = {
      onlyfans_connected: false,
      feed_post_count: null,
      posts_with_comments: null,
    }

    if (list.length === 0) {
      const { data: conn } = await supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .maybeSingle()

      meta.onlyfans_connected = Boolean(conn?.access_token)
      if (conn?.access_token) {
        try {
          const api = createOnlyFansAPI(conn.access_token)
          const feed = await api.getPosts({ limit: 25, offset: 0 })
          const posts = feed.posts ?? []
          meta.feed_post_count = posts.length
          meta.posts_with_comments = posts.filter((p: { comments?: number }) => (p.comments ?? 0) > 0).length
        } catch {
          meta.feed_post_count = null
          meta.posts_with_comments = null
        }
      }
    }

    return NextResponse.json({ comments, meta })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list comments' },
      { status: 500 },
    )
  }
}
