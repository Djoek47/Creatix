import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  WELLBEING_ACTIVITY_HEARTBEAT_MIN_INTERVAL_MS,
  isMeaningfulActionKind,
} from '@/lib/wellbeing/wellbeing-activity-kinds'

export const maxDuration = 15

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const wantsHeartbeat = body?.heartbeat === true
    const actionKind = body?.actionKind

    const meaningful =
      typeof actionKind === 'string' && isMeaningfulActionKind(actionKind) ? actionKind : null

    if (!wantsHeartbeat && !meaningful) {
      return NextResponse.json({ ok: true })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const todayUtc = utcDayKey(now)

    const { data: row } = await supabase
      .from('user_wellbeing_activity')
      .select(
        'last_heartbeat_at, last_meaningful_action_at, actions_bucket_date, meaningful_actions_count',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    let heartbeatAllowed = false
    if (wantsHeartbeat) {
      const last = row?.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : 0
      heartbeatAllowed =
        !last || !Number.isFinite(last) || now.getTime() - last >= WELLBEING_ACTIVITY_HEARTBEAT_MIN_INTERVAL_MS
      if (!heartbeatAllowed && !meaningful) {
        return NextResponse.json({ ok: true })
      }
    }

    let nextHb = row?.last_heartbeat_at ?? null
    if (wantsHeartbeat && heartbeatAllowed) {
      nextHb = nowIso
    }

    let nextMa = row?.last_meaningful_action_at ?? null
    let bucket = row?.actions_bucket_date ?? null
    let count = typeof row?.meaningful_actions_count === 'number' ? row.meaningful_actions_count : 0

    if (meaningful) {
      nextMa = nowIso
      if (bucket !== todayUtc) {
        bucket = todayUtc
        count = 1
      } else {
        count += 1
      }
    }

    const patch = {
      user_id: user.id,
      last_heartbeat_at: nextHb,
      last_meaningful_action_at: nextMa,
      actions_bucket_date: bucket,
      meaningful_actions_count: count,
      updated_at: nowIso,
    }

    const { error } = await supabase.from('user_wellbeing_activity').upsert(patch, {
      onConflict: 'user_id',
    })

    if (error) {
      console.warn('[wellbeing/activity] upsert:', error.message)
      return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[wellbeing/activity]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
