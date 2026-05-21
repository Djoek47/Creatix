import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin-api'

type ModerationStatus = 'approved' | 'rejected' | 'pending'

function isModerationStatus(value: unknown): value is ModerationStatus {
  return value === 'approved' || value === 'rejected' || value === 'pending'
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing tip id.' }, { status: 400 })

  const payload = (await request.json().catch(() => ({}))) as { status?: unknown }
  if (!isModerationStatus(payload.status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('community_tips')
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Tip not found.' }, { status: 404 })

  return NextResponse.json({ tip: data })
}
