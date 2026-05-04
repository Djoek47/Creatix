import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { TIKTOK_USER_INFO_URL, tiktokVideoListUrl } from '@/lib/tiktok-open-api'

// POST: Sync TikTok data to analytics_snapshots (user.info.* + video.list scopes)
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'TikTok not connected' }, { status: 400 })
    }

    const accessToken = connection.access_token as string

    try {
      const response = await fetch(TIKTOK_USER_INFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`TikTok user info error: ${response.status}`)
      }

      const data = await response.json()
      const err = data.error as { code?: string; message?: string } | undefined
      if (err && err.code && err.code !== 'ok') {
        throw new Error(err.message || err.code || 'TikTok user info failed')
      }

      const userInfo = (data.data?.user || {}) as Record<string, unknown>

      let videos: unknown[] = []
      let videoListCursor: number | null = null
      let videoListHasMore = false
      try {
        const vRes = await fetch(tiktokVideoListUrl(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max_count: 20 }),
        })
        if (vRes.ok) {
          const vJson = await vRes.json()
          const vErr = vJson.error as { code?: string } | undefined
          if (!vErr || vErr.code === 'ok') {
            const vData = vJson.data as {
              videos?: unknown[]
              cursor?: number
              has_more?: boolean
            } | null
            videos = Array.isArray(vData?.videos) ? vData!.videos! : []
            videoListCursor = typeof vData?.cursor === 'number' ? vData.cursor : null
            videoListHasMore = Boolean(vData?.has_more)
          }
        }
      } catch {
        // video.list optional if token lacks scope or API degrades
      }

      const today = new Date().toISOString().split('T')[0]
      await supabase.from('analytics_snapshots').upsert(
        {
          user_id: user.id,
          platform: 'tiktok',
          date: today,
          total_fans: Number(userInfo.follower_count) || 0,
          new_fans: 0,
          revenue: 0,
          messages_received: 0,
          messages_sent: 0,
        },
        {
          onConflict: 'user_id,platform,date',
        },
      )

      return NextResponse.json({
        success: true,
        user: {
          display_name: userInfo.display_name,
          username: userInfo.username,
          bio_description: userInfo.bio_description,
          profile_deep_link: userInfo.profile_deep_link,
          profile_web_link: userInfo.profile_web_link,
          is_verified: userInfo.is_verified,
          follower_count: userInfo.follower_count,
          following_count: userInfo.following_count,
          likes_count: userInfo.likes_count,
          video_count: userInfo.video_count,
        },
        videos,
        video_list: { cursor: videoListCursor, has_more: videoListHasMore },
      })
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to sync TikTok data',
          success: false,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('[tiktok/sync] POST', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 },
    )
  }
}
