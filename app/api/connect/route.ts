import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Platform } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('platform_connections')
    .select('platform')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const platforms = (data ?? []).map((r) => r.platform as Platform)
  return NextResponse.json({ platforms })
}
