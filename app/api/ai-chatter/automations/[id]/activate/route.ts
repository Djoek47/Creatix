import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { primeAiChatterThread } from '@/lib/divine/ai-chatter-worker'

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

/**
 * POST { setActive?: boolean } — refresh thread insight for the automation fan; optionally mark active.
 */
export async function POST(
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
      .select('id, platform_fan_id, platform, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (loadErr || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (row.platform !== 'onlyfans') {
      return NextResponse.json({ error: 'Only OnlyFans is supported' }, { status: 400 })
    }

    const body = (await req.json().catch(() => ({}))) as { setActive?: boolean }
    const setActive = body.setActive === true

    const prime = await primeAiChatterThread(supabase, user.id, String(row.platform_fan_id))
    if (!prime.ok) {
      return NextResponse.json({ ok: false, error: prime.error, primed: false }, { status: 200 })
    }

    if (setActive) {
      const { error: upErr } = await supabase
        .from('ai_chatter_automations')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
      if (upErr) {
        return NextResponse.json({ ok: true, primed: true, error: upErr.message, activated: false }, { status: 200 })
      }
    }

    return NextResponse.json({ ok: true, primed: true, activated: setActive })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Activate failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
