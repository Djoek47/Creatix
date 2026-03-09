import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Platform } from '@/lib/types'

const VALID_PLATFORMS: Platform[] = ['onlyfans', 'mym', 'fansly']

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  if (!platform || !VALID_PLATFORMS.includes(platform as Platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Update last_sync_at on the connection
  const { error: updateErr } = await supabase
    .from('platform_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('platform', platform)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Stub: In production you would call the platform API (OnlyFans/MYM/Fansly)
  // to fetch fans, messages, earnings and insert into fans, conversations, analytics_snapshots.
  // Here we only update last_sync_at; you can add mock fan rows for demo if needed.
  return NextResponse.json({ success: true, synced_at: new Date().toISOString() })
}
