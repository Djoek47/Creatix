import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { buildUnifiedFanProfile } from '@/lib/divine/fan-profile-server'
import { getFanRecentById } from '@/lib/divine/fan-recents-server'

/**
 * GET ?fanId=&platform=onlyfans — aggregated fan core + thread insight + AI summary + creator detector (profile UI).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fanId = searchParams.get('fanId')?.trim() ?? ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const platform = (searchParams.get('platform')?.trim() || 'onlyfans').toLowerCase()

    const profile = await buildUnifiedFanProfile(supabase, user.id, fanId, platform)
    return NextResponse.json(profile)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load fan profile'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PATCH { fanId, platform?, creator_classification? } — nullable creator label on fans row (RLS).
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fanId?: string
      platform?: string
      creator_classification?: string | null
      treat_as_fan_for_automation?: boolean
    }
    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const platform = (body.platform?.trim() || 'onlyfans').toLowerCase()
    if (platform !== 'onlyfans' && platform !== 'fansly') {
      return NextResponse.json({ error: 'platform must be onlyfans or fansly' }, { status: 400 })
    }

    let classification: string | null | undefined = undefined
    if (body.creator_classification !== undefined) {
      if (body.creator_classification === null || body.creator_classification === '') {
        classification = null
      } else if (typeof body.creator_classification === 'string') {
        classification = body.creator_classification.trim().slice(0, 2000) || null
      } else {
        return NextResponse.json({ error: 'creator_classification invalid' }, { status: 400 })
      }
    }

    let treatAsFan: boolean | undefined = undefined
    if (body.treat_as_fan_for_automation !== undefined) {
      if (typeof body.treat_as_fan_for_automation !== 'boolean') {
        return NextResponse.json({ error: 'treat_as_fan_for_automation must be boolean' }, { status: 400 })
      }
      treatAsFan = body.treat_as_fan_for_automation
    }

    if (classification === undefined && treatAsFan === undefined) {
      return NextResponse.json(
        { error: 'Provide creator_classification and/or treat_as_fan_for_automation' },
        { status: 400 },
      )
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (classification !== undefined) patch.creator_classification = classification
    if (treatAsFan !== undefined) patch.treat_as_fan_for_automation = treatAsFan

    const { data: existingFan, error: selErr } = await supabase
      .from('fans')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('platform_fan_id', fanId)
      .maybeSingle()

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })

    if (existingFan?.id) {
      const { error } = await supabase.from('fans').update(patch).eq('id', existingFan.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const recent = await getFanRecentById(supabase, user.id, fanId, platform)
      const safeFanKey = fanId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
      const username = (recent?.username?.trim() || `fan_${safeFanKey}`).slice(0, 200)
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        platform,
        platform_fan_id: fanId,
        username,
        display_name: recent?.display_name?.slice(0, 200) ?? null,
        avatar_url: recent?.avatar_url ?? null,
        ...patch,
      }
      const { error: insErr } = await supabase.from('fans').insert(insertPayload)
      if (insErr) {
        const isDup =
          insErr.code === '23505' ||
          /duplicate key|unique constraint/i.test(insErr.message ?? '')
        if (isDup) {
          const { error: upErr } = await supabase
            .from('fans')
            .update(patch)
            .eq('user_id', user.id)
            .eq('platform', platform)
            .eq('platform_fan_id', fanId)
          if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
        } else {
          return NextResponse.json({ error: insErr.message }, { status: 500 })
        }
      }
    }

    const profile = await buildUnifiedFanProfile(supabase, user.id, fanId, platform)
    return NextResponse.json(profile)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update classification'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
