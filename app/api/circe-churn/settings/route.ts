import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { defaultCirceChurnSettings, type CirceChurnSettingsRow } from '@/lib/circe-churn/run-for-user'
import { hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'

const CADENCES = new Set(['off', 'daily', 'weekly'])

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row } = await supabase.from('circe_churn_settings').select('*').eq('user_id', user.id).maybeSingle()

  if (!row) {
    return NextResponse.json({ settings: defaultCirceChurnSettings(user.id) })
  }

  return NextResponse.json({ settings: row })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled

  if (typeof body.run_cadence === 'string') {
    if (!CADENCES.has(body.run_cadence)) {
      return NextResponse.json({ error: 'Invalid run_cadence' }, { status: 400 })
    }
    patch.run_cadence = body.run_cadence
  }

  if (typeof body.run_hour_utc === 'number' && Number.isInteger(body.run_hour_utc)) {
    if (body.run_hour_utc < 0 || body.run_hour_utc > 23) {
      return NextResponse.json({ error: 'run_hour_utc must be 0–23' }, { status: 400 })
    }
    patch.run_hour_utc = body.run_hour_utc
  }

  if (typeof body.expiring_within_days === 'number' && Number.isInteger(body.expiring_within_days)) {
    if (body.expiring_within_days < 1 || body.expiring_within_days > 90) {
      return NextResponse.json({ error: 'expiring_within_days must be 1–90' }, { status: 400 })
    }
    patch.expiring_within_days = body.expiring_within_days
  }

  if (typeof body.stale_interaction_days === 'number' && Number.isInteger(body.stale_interaction_days)) {
    if (body.stale_interaction_days < 3 || body.stale_interaction_days > 60) {
      return NextResponse.json({ error: 'stale_interaction_days must be 3–60' }, { status: 400 })
    }
    patch.stale_interaction_days = body.stale_interaction_days
  }

  if (typeof body.include_stale_active === 'boolean') patch.include_stale_active = body.include_stale_active
  if (typeof body.notify_on_run_summary === 'boolean') patch.notify_on_run_summary = body.notify_on_run_summary
  if (typeof body.notify_when_empty === 'boolean') patch.notify_when_empty = body.notify_when_empty
  if (typeof body.link_divine_manager_tasks === 'boolean') patch.link_divine_manager_tasks = body.link_divine_manager_tasks
  if (typeof body.link_protocol_tasks === 'boolean') patch.link_protocol_tasks = body.link_protocol_tasks
  if (typeof body.tease_future_content === 'boolean') patch.tease_future_content = body.tease_future_content
  if (typeof body.calendar_teaser_notes === 'string') {
    const t = body.calendar_teaser_notes.trim()
    patch.calendar_teaser_notes = t.length ? t.slice(0, 4000) : null
  }

  if (typeof body.max_fans_per_run === 'number' && Number.isInteger(body.max_fans_per_run)) {
    if (body.max_fans_per_run < 1 || body.max_fans_per_run > 25) {
      return NextResponse.json({ error: 'max_fans_per_run must be 1–25' }, { status: 400 })
    }
    patch.max_fans_per_run = body.max_fans_per_run
  }

  if (typeof body.credits_per_run === 'number' && Number.isInteger(body.credits_per_run)) {
    if (body.credits_per_run < 1 || body.credits_per_run > 10) {
      return NextResponse.json({ error: 'credits_per_run must be 1–10' }, { status: 400 })
    }
    patch.credits_per_run = body.credits_per_run
  }

  const { data: existing } = await supabase.from('circe_churn_settings').select('*').eq('user_id', user.id).maybeSingle()
  const base = existing ? (existing as CirceChurnSettingsRow) : defaultCirceChurnSettings(user.id)
  const merged: CirceChurnSettingsRow = {
    ...base,
    ...(patch as Partial<CirceChurnSettingsRow>),
    user_id: user.id,
  }

  if (merged.enabled) {
    const need = Math.min(10, Math.max(1, Math.round(Number(merged.credits_per_run ?? 2))))
    const check = await hasEnoughAiCredits(supabase, user.id, need)
    if (!check.ok) {
      return insufficientAiCreditsResponse(check.used, check.limit)
    }
  }

  const rowToUpsert = {
    ...merged,
    updated_at: new Date().toISOString(),
  }

  const { data: upserted, error } = await supabase
    .from('circe_churn_settings')
    .upsert(rowToUpsert, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[circe-churn settings]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: upserted })
}
