import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

/** Recent chat fans (OnlyFans) from divine_fan_recents for Ariadne recipient picker. */
export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('divine_fan_recents')
    .select('fan_id, username, display_name, platform, last_seen_at')
    .eq('user_id', user.id)
    .eq('platform', 'onlyfans')
    .order('last_seen_at', { ascending: false })
    .limit(400)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ fans: data ?? [] })
}
