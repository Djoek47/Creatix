import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { buildCommentIdempotencyKey } from '@/lib/commenter/idempotency'
import { processPlatformPostCommentById } from '@/lib/commenter/process-comment'
import { onlyFansPartnerAccountIdFromRow } from '@/lib/platform-partner-account-id'

type LooseSb = SupabaseClient<any, 'public', any, any>

export type SyncPostCommentsResult = {
  postsScanned: number
  commentsInserted: number
  commentsSkippedDuplicate: number
  analyzeTriggered: number
  errors: string[]
}

/**
 * Pull comments from OnlyFans API into platform_post_comments and queue analysis.
 */
export async function syncOnlyFansPostCommentsForUser(
  supabase: LooseSb,
  userId: string,
  opts?: {
    postId?: string
    maxPosts?: number
    commentsPerPost?: number
    runAnalysis?: boolean
  },
): Promise<SyncPostCommentsResult> {
  const maxPosts = Math.min(Math.max(opts?.maxPosts ?? 8, 1), 25)
  const commentsPerPost = Math.min(Math.max(opts?.commentsPerPost ?? 30, 1), 80)
  const runAnalysis = opts?.runAnalysis !== false

  const result: SyncPostCommentsResult = {
    postsScanned: 0,
    commentsInserted: 0,
    commentsSkippedDuplicate: 0,
    analyzeTriggered: 0,
    errors: [],
  }

  const { data: connection, error: connErr } = await supabase
    .from('platform_connections')
    .select('access_token, platform_user_id')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  const accountId = onlyFansPartnerAccountIdFromRow(connection)
  if (connErr || !accountId) {
    result.errors.push('OnlyFans not connected')
    return result
  }

  const api = createOnlyFansAPI(accountId)

  const postIds: string[] = []
  if (opts?.postId) {
    postIds.push(String(opts.postId))
  } else {
    try {
      const feed = await api.getPosts({ limit: maxPosts, offset: 0 })
      for (const p of feed.posts || []) {
        if ((p.comments ?? 0) > 0) postIds.push(String(p.id))
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : 'getPosts failed')
      return result
    }
  }

  for (const postId of postIds) {
    result.postsScanned++
    let offset = 0
    for (;;) {
      let page: Awaited<ReturnType<typeof api.getPostComments>>
      try {
        page = await api.getPostComments(postId, {
          limit: commentsPerPost,
          offset,
          sort: 'desc',
        })
      } catch (e) {
        result.errors.push(`${postId}: ${e instanceof Error ? e.message : 'comments fetch failed'}`)
        break
      }

      const batch = page.comments ?? []
      if (batch.length === 0) break

      for (const c of batch) {
        const fanId = c.fromUser?.id ?? c.user?.id ?? ''
        const text = c.text?.trim() ?? ''
        if (!fanId || !text) continue

        const idempotency_key = buildCommentIdempotencyKey([
          'api_sync',
          postId,
          fanId,
          c.id || '',
          text.slice(0, 500),
        ])

        const username = c.fromUser?.username ?? c.user?.username ?? null
        const name = c.fromUser?.name ?? c.user?.name ?? null

        const { data: inserted, error: insErr } = await supabase
          .from('platform_post_comments')
          .insert({
            user_id: userId,
            platform: 'onlyfans',
            platform_post_id: postId,
            platform_fan_id: String(fanId),
            fan_username: username,
            fan_display_name: name,
            platform_comment_id: c.id || null,
            idempotency_key,
            comment_text: text,
            source: 'post',
            raw_payload: c as unknown as Record<string, unknown>,
            external_created_at: c.createdAt ?? null,
            analysis_status: 'pending',
          })
          .select('id')
          .maybeSingle()

        if (insErr) {
          if (insErr.code === '23505') {
            result.commentsSkippedDuplicate++
          } else {
            result.errors.push(insErr.message)
          }
          continue
        }

        if (inserted?.id) {
          result.commentsInserted++
          if (runAnalysis) {
            try {
              await processPlatformPostCommentById(supabase, inserted.id as string)
              result.analyzeTriggered++
            } catch (e) {
              result.errors.push(e instanceof Error ? e.message : 'process failed')
            }
          }
        }
      }

      if (page.hasMore === true && typeof page.nextOffset === 'number') {
        offset = page.nextOffset
        continue
      }
      if (batch.length < commentsPerPost) break
      offset += commentsPerPost
    }
  }

  return result
}
