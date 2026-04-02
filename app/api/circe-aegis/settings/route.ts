import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import type { CirceAegisSettingsRow } from '@/lib/circe-aegis/run-for-user'

const CADENCES = new Set(['off', 'daily', 'weekly'])
const SEVERITIES = new Set(['high', 'critical'])

function defaultsForUser(userId: string): CirceAegisSettingsRow {
  return {
    user_id: userId,
    enabled: false,
    scan_cadence: 'off',
    scan_hour_utc: 6,
    leak_scan_strict: true,
    include_content_titles: true,
    last_leak_scan_at: null,
    last_leak_scan_error: null,
    auto_dmca_draft_enabled: false,
    auto_dmca_min_severity: 'high',
    auto_dmca_require_page_verified: false,
    auto_dmca_max_per_run: 5,
    last_auto_dmca_at: null,
    notify_on_scan_summary: true,
    notify_on_new_leak: true,
    notify_on_auto_draft: true,
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row } = await supabase
    .from('circe_aegis_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ settings: defaultsForUser(user.id) })
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

  const nextAutoDmca =
    typeof body.auto_dmca_draft_enabled === 'boolean' ? body.auto_dmca_draft_enabled : undefined
  const ack =
    body.ack_auto_dmca_review === true ||
    body.acknowledge_auto_dmca === true ||
    body.ack_auto_dmca === true

  if (nextAutoDmca === true && !ack) {
    return NextResponse.json(
      {
        error:
          'Enabling auto DMCA drafts requires acknowledgement: set ack_auto_dmca_review (or acknowledge_auto_dmca) to true. You must review every draft before sending to third parties.',
      },
      { status: 400 },
    )
  }

  const patch: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled

  if (typeof body.scan_cadence === 'string') {
    if (!CADENCES.has(body.scan_cadence)) {
      return NextResponse.json({ error: 'Invalid scan_cadence' }, { status: 400 })
    }
    patch.scan_cadence = body.scan_cadence
  }

  if (typeof body.scan_hour_utc === 'number' && Number.isInteger(body.scan_hour_utc)) {
    if (body.scan_hour_utc < 0 || body.scan_hour_utc > 23) {
      return NextResponse.json({ error: 'scan_hour_utc must be 0–23' }, { status: 400 })
    }
    patch.scan_hour_utc = body.scan_hour_utc
  }

  if (typeof body.leak_scan_strict === 'boolean') patch.leak_scan_strict = body.leak_scan_strict
  if (typeof body.include_content_titles === 'boolean') patch.include_content_titles = body.include_content_titles

  if (typeof body.auto_dmca_draft_enabled === 'boolean') patch.auto_dmca_draft_enabled = body.auto_dmca_draft_enabled

  if (typeof body.auto_dmca_min_severity === 'string') {
    if (!SEVERITIES.has(body.auto_dmca_min_severity)) {
      return NextResponse.json({ error: 'Invalid auto_dmca_min_severity' }, { status: 400 })
    }
    patch.auto_dmca_min_severity = body.auto_dmca_min_severity
  }

  if (typeof body.auto_dmca_require_page_verified === 'boolean') {
    patch.auto_dmca_require_page_verified = body.auto_dmca_require_page_verified
  }

  if (typeof body.auto_dmca_max_per_run === 'number' && Number.isInteger(body.auto_dmca_max_per_run)) {
    if (body.auto_dmca_max_per_run < 0 || body.auto_dmca_max_per_run > 50) {
      return NextResponse.json({ error: 'auto_dmca_max_per_run must be 0–50' }, { status: 400 })
    }
    patch.auto_dmca_max_per_run = body.auto_dmca_max_per_run
  }

  if (typeof body.notify_on_scan_summary === 'boolean') patch.notify_on_scan_summary = body.notify_on_scan_summary
  if (typeof body.notify_on_new_leak === 'boolean') patch.notify_on_new_leak = body.notify_on_new_leak
  if (typeof body.notify_on_auto_draft === 'boolean') patch.notify_on_auto_draft = body.notify_on_auto_draft

  const { data: upserted, error } = await supabase
    .from('circe_aegis_settings')
    .upsert(patch, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[circe-aegis settings]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: upserted })
}
