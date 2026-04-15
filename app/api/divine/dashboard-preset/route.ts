import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getSettings } from '@/lib/divine-manager'
import {
  extractDashboardPreset,
  mergeDashboardPresetIntoRules,
  sanitizeDashboardPresetPartial,
} from '@/lib/dashboard/dashboard-preset'
import type { DivineDashboardPreset } from '@/lib/divine-manager'

/**
 * GET — current `automation_rules.dashboard` (auth).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = await getSettings(supabase, user.id)
    const dashboard = extractDashboardPreset(settings?.automation_rules ?? null)
    return NextResponse.json({ dashboard })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load dashboard preset'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PATCH — merge into `automation_rules.dashboard` (auth). Body: partial `DivineDashboardPreset` fields.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const raw = body.dashboard != null && typeof body.dashboard === 'object' ? body.dashboard : body
    const patch = sanitizeDashboardPresetPartial(raw) as Partial<DivineDashboardPreset>
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid dashboard fields in body.' }, { status: 400 })
    }

    const settings = await getSettings(supabase, user.id)
    const mergedRules = mergeDashboardPresetIntoRules(settings?.automation_rules ?? {}, patch)

    const { error } = await supabase.from('divine_manager_settings').upsert(
      {
        user_id: user.id,
        automation_rules: mergedRules as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      dashboard: extractDashboardPreset(mergedRules),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update dashboard preset'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
