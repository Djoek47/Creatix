import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  mergeMessagingReadPrefs,
  type MessagingReadPreferences,
  type PerChatReadOverride,
} from '@/lib/messaging-read-preferences'

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('messaging_read_preferences')
    .select('auto_mark_on_open, per_chat_overrides')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mergeMessagingReadPrefs(data))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    auto_mark_on_open?: boolean
    setChatOverride?: {
      platform?: string
      fanId?: string
      behavior?: 'inherit' | 'auto' | 'never'
    }
  }

  const { data: existing } = await supabase
    .from('messaging_read_preferences')
    .select('auto_mark_on_open, per_chat_overrides')
    .eq('user_id', user.id)
    .maybeSingle()

  let next: MessagingReadPreferences = mergeMessagingReadPrefs(existing)

  if (typeof body.auto_mark_on_open === 'boolean') {
    next = { ...next, auto_mark_on_open: body.auto_mark_on_open }
  }

  if (body.setChatOverride && typeof body.setChatOverride === 'object') {
    const { platform, fanId, behavior } = body.setChatOverride
    const p = platform === 'onlyfans' || platform === 'fansly' ? platform : null
    const fid = typeof fanId === 'string' && fanId.trim() ? fanId.trim() : null
    if (p && fid && (behavior === 'inherit' || behavior === 'auto' || behavior === 'never')) {
      const key = `${p}:${fid}`
      const overrides = { ...next.per_chat_overrides }
      if (behavior === 'inherit') {
        delete overrides[key]
      } else {
        overrides[key] = behavior as PerChatReadOverride
      }
      next = { ...next, per_chat_overrides: overrides }
    }
  }

  const hasPatch =
    typeof body.auto_mark_on_open === 'boolean' ||
    !!(body.setChatOverride && typeof body.setChatOverride === 'object')

  if (!hasPatch) {
    return NextResponse.json(next)
  }

  const { data: row, error } = await supabase
    .from('messaging_read_preferences')
    .upsert(
      {
        user_id: user.id,
        auto_mark_on_open: next.auto_mark_on_open,
        per_chat_overrides: next.per_chat_overrides,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('auto_mark_on_open, per_chat_overrides')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mergeMessagingReadPrefs(row))
}
