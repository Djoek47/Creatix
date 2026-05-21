import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createFanslyAPI } from '@/lib/fansly-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { platform?: string }
    const platform = body.platform
    if (platform !== 'onlyfans' && platform !== 'fansly') {
      return NextResponse.json({ error: 'platform must be onlyfans or fansly' }, { status: 400 })
    }

    const { data: row } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id, is_connected')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('is_connected', true)
      .maybeSingle()

    if (!row) {
      return NextResponse.json(
        { error: `${platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'} is not connected` },
        { status: 400 },
      )
    }

    let avatarUrl: string | null = null

    if (platform === 'onlyfans') {
      const accountId = row.access_token as string | null
      if (!accountId?.trim()) {
        return NextResponse.json({ error: 'OnlyFans session missing — reconnect in Integrations.' }, { status: 400 })
      }
      const api = createOnlyFansAPI(accountId.trim())
      const acc = await api.getAccount()
      avatarUrl = typeof acc.avatar === 'string' ? acc.avatar.trim() : null
    } else {
      const accountIdRaw = (row.access_token ?? row.platform_user_id) as string | null
      const accountId = accountIdRaw?.trim()
      if (!accountId) {
        return NextResponse.json({ error: 'Fansly session missing — reconnect in Integrations.' }, { status: 400 })
      }
      const api = createFanslyAPI(accountId)
      const prof = await api.getProfile(accountId)
      avatarUrl = typeof prof.avatar === 'string' ? prof.avatar.trim() : null
    }

    if (!avatarUrl || !/^https:\/\//i.test(avatarUrl)) {
      return NextResponse.json(
        { error: 'This platform did not return a usable profile image URL.' },
        { status: 422 },
      )
    }

    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch platform avatar'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
