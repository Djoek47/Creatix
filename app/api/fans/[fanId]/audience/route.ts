import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = new Set(['auto', 'whale', 'creator', 'fan'])

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ fanId: string }> },
) {
  const { fanId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await _request.json().catch(() => ({}))) as {
    audience_profile_override?: unknown
  }
  const raw = body?.audience_profile_override
  if (raw !== null && raw !== undefined && typeof raw !== 'string') {
    return NextResponse.json({ error: 'Invalid audience_profile_override' }, { status: 400 })
  }
  const s = raw === null || raw === undefined ? '' : String(raw).trim()
  if (s !== '' && !ALLOWED.has(s)) {
    return NextResponse.json({ error: 'Invalid audience_profile_override' }, { status: 400 })
  }

  const val = s === '' || s === 'auto' ? null : s

  const { error } = await supabase
    .from('fans')
    .update({
      audience_profile_override: val,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fanId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, audience_profile_override: val })
}
