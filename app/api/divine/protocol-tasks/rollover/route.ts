import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runProtocolPlanRollover } from '@/lib/divine/protocol-plan-rollover'

/**
 * POST — run daily plan rollover for the current user (incomplete tasks from past days → today + leftover flag).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rolled } = await runProtocolPlanRollover(supabase, user.id)
    return NextResponse.json({ ok: true, rolled })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Rollover failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
