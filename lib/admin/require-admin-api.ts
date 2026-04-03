import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** For Route Handlers: cookie session + profiles.role = admin */
export async function requireAdminApi(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (String((profile as { role?: string } | null)?.role ?? '').toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { userId: user.id }
}
