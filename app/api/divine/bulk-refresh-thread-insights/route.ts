import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { refreshFanThreadInsight } from '@/lib/divine/fan-thread-insight'

const MAX_BATCH = 25
const DELAY_MS = 800

/**
 * POST { platform?, batchSize?, offset? } — sequential thread insight refresh for CRM (rate-limit friendly).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      platform?: string
      batchSize?: number
      offset?: number
    }
    const platform = body.platform === 'fansly' ? 'fansly' : 'onlyfans'
    const batchSize = Math.min(
      MAX_BATCH,
      Math.max(1, Number(body.batchSize) || 12),
    )
    const offset = Math.max(0, Number(body.offset) || 0)

    const { data: fanRows, error: fanErr } = await supabase
      .from('fans')
      .select('platform_fan_id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .not('platform_fan_id', 'is', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (fanErr) return NextResponse.json({ error: fanErr.message }, { status: 500 })

    const ids = (fanRows || [])
      .map((r) => (r as { platform_fan_id?: string | null }).platform_fan_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    const errors: string[] = []
    let processed = 0
    let skipped = 0

    for (const fanId of ids) {
      const result = await refreshFanThreadInsight(supabase, user.id, fanId, {
        force: true,
        skipDebounce: true,
        platform,
        mode: 'manual_scan',
      })
      if (!result.ok) {
        errors.push(`${fanId}: ${result.error}`)
      } else {
        processed += 1
        if (result.skipped) skipped += 1
      }
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }

    const nextOffset = ids.length < batchSize ? null : offset + batchSize

    return NextResponse.json({
      ok: true,
      processed,
      skipped,
      errors,
      nextOffset,
      batchSize: ids.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bulk refresh failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
