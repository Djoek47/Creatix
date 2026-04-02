import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { parseAiChatterSettings } from '@/lib/divine/ai-chatter-types'

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

/**
 * GET — list automations for the signed-in creator + recent events.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: automations, error: aErr } = await supabase
      .from('ai_chatter_automations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 })

    const { data: events, error: eErr } = await supabase
      .from('ai_chatter_events')
      .select('id, automation_id, type, payload, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 400 })

    return NextResponse.json({
      automations: automations ?? [],
      events: events ?? [],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load automations'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST { fan_id, settings?, status? } — create automation for an OnlyFans fan row in CRM.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fan_id?: string
      settings?: Record<string, unknown>
      status?: 'draft_setup' | 'active' | 'paused'
    }
    const fanId = typeof body.fan_id === 'string' ? body.fan_id.trim() : ''
    if (!fanId || !isUuid(fanId)) {
      return NextResponse.json({ error: 'fan_id must be a valid UUID (fans.id)' }, { status: 400 })
    }

    const { data: fan, error: fanErr } = await supabase
      .from('fans')
      .select('id, user_id, platform, platform_fan_id, username, display_name')
      .eq('id', fanId)
      .maybeSingle()

    if (fanErr || !fan) {
      return NextResponse.json({ error: 'Fan not found' }, { status: 404 })
    }
    if (fan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (fan.platform !== 'onlyfans') {
      return NextResponse.json({ error: 'Only OnlyFans fans are supported for now' }, { status: 400 })
    }

    const platformFanId = String(fan.platform_fan_id ?? '').trim()
    if (!platformFanId) {
      return NextResponse.json({ error: 'Fan is missing platform_fan_id' }, { status: 400 })
    }

    const username =
      (typeof fan.username === 'string' && fan.username) ||
      (typeof fan.display_name === 'string' && fan.display_name) ||
      null

    const mergedSettings = parseAiChatterSettings(
      typeof body.settings === 'object' && body.settings ? body.settings : undefined,
    )

    const status =
      body.status === 'active' || body.status === 'paused' || body.status === 'draft_setup'
        ? body.status
        : 'draft_setup'

    const { data: existing } = await supabase
      .from('ai_chatter_automations')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('fan_id', fanId)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json(
        { error: 'Automation already exists for this fan', automation_id: existing.id },
        { status: 409 },
      )
    }

    const { data: row, error: insErr } = await supabase
      .from('ai_chatter_automations')
      .insert({
        user_id: user.id,
        platform: 'onlyfans',
        fan_id: fanId,
        platform_fan_id: platformFanId,
        fan_username: username,
        status,
        settings: mergedSettings as unknown as Record<string, unknown>,
      })
      .select('*')
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
    return NextResponse.json({ automation: row })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create automation'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
