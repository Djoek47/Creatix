import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getFanRecentById } from '@/lib/divine/fan-recents-server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { extractAboutFromOnlyFansFanPayload } from '@/lib/onlyfans/extract-fan-about'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

export const maxDuration = 60

/**
 * POST { fanId: platform_fan_id } — fetch OnlyFans /fans/{id} and store platform_about when the API exposes it.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const body = (await req.json().catch(() => ({}))) as { fanId?: string; force?: boolean }
    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const force = body.force === true

    const { data: fanRow, error: fanErr } = await supabase
      .from('fans')
      .select('platform_about_fetched_at, platform_fan_id')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('platform_fan_id', fanId)
      .maybeSingle()

    if (fanErr) return NextResponse.json({ error: fanErr.message }, { status: 500 })

    // Profile UI can load from recents/thread tables without a `fans` row; align with PATCH
    // /api/divine/fan-profile so "Refresh from OnlyFans" still persists platform_about.
    let resolvedFanRow = fanRow as
      | { platform_about_fetched_at?: string | null; platform_fan_id?: string }
      | null
    if (!resolvedFanRow) {
      const recent = await getFanRecentById(supabase, user.id, fanId, 'onlyfans')
      const safeFanKey = fanId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
      const username = (recent?.username?.trim() || `fan_${safeFanKey}`).slice(0, 200)
      const nowIso = new Date().toISOString()
      const insertPayload = {
        user_id: user.id,
        platform: 'onlyfans' as const,
        platform_fan_id: fanId,
        username,
        display_name: recent?.display_name?.slice(0, 200) ?? null,
        avatar_url: recent?.avatar_url ?? null,
        updated_at: nowIso,
      }
      const { error: insErr } = await supabase.from('fans').insert(insertPayload)
      if (insErr) {
        const isDup =
          insErr.code === '23505' ||
          /duplicate key|unique constraint/i.test(insErr.message ?? '')
        if (!isDup) return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
      const { data: again, error: againErr } = await supabase
        .from('fans')
        .select('platform_about_fetched_at, platform_fan_id')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('platform_fan_id', fanId)
        .maybeSingle()
      if (againErr) return NextResponse.json({ error: againErr.message }, { status: 500 })
      if (!again) {
        return NextResponse.json({ error: 'Fan not found in CRM' }, { status: 404 })
      }
      resolvedFanRow = again as { platform_about_fetched_at?: string | null; platform_fan_id?: string }
    }

    const lastAt = resolvedFanRow.platform_about_fetched_at
    if (!force && lastAt) {
      const t = new Date(lastAt).getTime()
      if (!Number.isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ success: true, skipped: true, reason: 'fetched_within_24h' })
      }
    }

    const { data: connection, error: connErr } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (connErr || !connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI(connection.access_token)
    let raw: unknown
    try {
      raw = await api.getFanDetailRaw(fanId)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'OnlyFans API request failed' },
        { status: 502 },
      )
    }

    const about = extractAboutFromOnlyFansFanPayload(raw)
    const now = new Date().toISOString()

    const { error: upErr } = await supabase
      .from('fans')
      .update({
        platform_about: about,
        platform_about_fetched_at: now,
        updated_at: now,
      })
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('platform_fan_id', fanId)

    if (upErr) {
      if (upErr.message.includes('platform_about')) {
        return NextResponse.json(
          { error: 'Database missing platform_about column. Run migration 048_fans_platform_about_crm.sql.' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      about: about ?? null,
      aboutLength: about?.length ?? 0,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Enrich failed' },
      { status: 500 },
    )
  }
}
