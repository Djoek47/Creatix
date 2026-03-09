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

  // Upsert connection. In production you would exchange OAuth code for tokens here.
  const { error } = await supabase
    .from('platform_connections')
    .upsert(
      {
        user_id: user.id,
        platform,
        platform_username: null,
        access_token: 'placeholder', // Replace with real token from OAuth
        refresh_token: null,
        is_connected: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, platform })
}

export async function DELETE(
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

  const { error } = await supabase
    .from('platform_connections')
    .update({ is_connected: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('platform', platform)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, disconnected: platform })
}
