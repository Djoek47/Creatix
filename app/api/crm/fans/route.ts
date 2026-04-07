/**
 * GET /api/crm/fans
 * Unified fan list for CRM UIs: merges Supabase `fans` (rich CRM fields) with live
 * OnlyFans + Fansly subscriber lists when those platforms are connected.
 * Database rows win on duplicate (platform + platform_fan_id).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { loadHybridCrmFans } from '@/lib/crm/load-hybrid-fans'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    /** `database` = DB only (fast). Default `hybrid` = DB + live OF/Fansly when connected. */
    const mode = (searchParams.get('mode') || 'hybrid') as 'hybrid' | 'database'
    const limitOf = Math.min(parseInt(searchParams.get('limit_of') || '150', 10), 200)
    const limitFansly = Math.min(parseInt(searchParams.get('limit_fansly') || '150', 10), 200)

    const result = await loadHybridCrmFans(supabase, user.id, {
      mode,
      limitOf,
      limitFansly,
      billingPolicy: 'strict',
    })
    if (!result.ok) return result.response

    return NextResponse.json({
      fans: result.fans,
      meta: result.meta,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load CRM fans'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
