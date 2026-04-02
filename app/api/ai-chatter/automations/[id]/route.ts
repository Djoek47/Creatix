import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { parseAiChatterSettings } from '@/lib/divine/ai-chatter-types'

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
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

    const { data: row, error: loadErr } = await supabase
      .from('ai_chatter_automations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (loadErr || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      settings?: Record<string, unknown>
      status?: 'draft_setup' | 'active' | 'paused'
      beta_acknowledged?: boolean
      beta_acknowledged_at?: string | null
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.status === 'draft_setup' || body.status === 'active' || body.status === 'paused') {
      patch.status = body.status
    }

    if (body.beta_acknowledged === true) {
      patch.beta_acknowledged_at = new Date().toISOString()
    } else if (body.beta_acknowledged === false) {
      patch.beta_acknowledged_at = null
    } else if (body.beta_acknowledged_at === null) {
      patch.beta_acknowledged_at = null
    } else if (typeof body.beta_acknowledged_at === 'string') {
      patch.beta_acknowledged_at = body.beta_acknowledged_at
    }

    if (body.settings && typeof body.settings === 'object') {
      const merged = parseAiChatterSettings({ ...(row.settings as object), ...body.settings })
      patch.settings = merged
    }

    const { data: updated, error: upErr } = await supabase
      .from('ai_chatter_automations')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
    return NextResponse.json({ automation: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from('ai_chatter_automations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
