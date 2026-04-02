import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: row, error } = await supabase
      .from('ai_chatter_outbox')
      .select('id, draft_text, platform_fan_id, platform, status, inbound_message_id, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ outbox: row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load draft'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { status?: 'pending' | 'applied' | 'dismissed' }
    const status = body.status
    if (status !== 'applied' && status !== 'dismissed' && status !== 'pending') {
      return NextResponse.json({ error: 'status must be pending, applied, or dismissed' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('ai_chatter_outbox')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, status')
      .maybeSingle()

    if (error || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ outbox: row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
