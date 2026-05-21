import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  defaultCreditAutoTopupSettings,
  validateAutoTopupPatch,
  type CreditAutoTopupStatus,
} from '@/lib/billing/credit-auto-topup'

type PatchBody = {
  enabled?: boolean
  threshold_credits?: number
  pack_id?: string
  monthly_max_usd_cents?: number
  cooldown_minutes?: number
}

function nextStatus(enabled: boolean | undefined, previous: CreditAutoTopupStatus): CreditAutoTopupStatus {
  if (enabled === false) return 'disabled_by_user'
  if (enabled === true) return 'active'
  return previous
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: PatchBody
    try {
      body = (await req.json()) as PatchBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validationError = validateAutoTopupPatch(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('credit_auto_topup_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const base = existing ?? defaultCreditAutoTopupSettings(user.id)
    const prevStatus = base.status as CreditAutoTopupStatus
    const enabling = body.enabled === true

    const merged = {
      user_id: user.id,
      enabled: body.enabled !== undefined ? body.enabled : base.enabled,
      threshold_credits: body.threshold_credits ?? base.threshold_credits,
      pack_id: body.pack_id ?? base.pack_id,
      monthly_max_usd_cents: body.monthly_max_usd_cents ?? base.monthly_max_usd_cents,
      cooldown_minutes: body.cooldown_minutes ?? base.cooldown_minutes,
      monthly_spent_usd_cents: base.monthly_spent_usd_cents,
      monthly_window_start: base.monthly_window_start,
      last_attempt_at: base.last_attempt_at,
      last_success_at: base.last_success_at,
      last_payment_intent_id: base.last_payment_intent_id,
      last_error: enabling ? null : base.last_error,
      status: nextStatus(body.enabled, prevStatus),
      consecutive_failures: enabling ? 0 : base.consecutive_failures,
      created_at: (base as { created_at?: string }).created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: saved, error } = await supabase
      .from('credit_auto_topup_settings')
      .upsert(merged, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ autoTopupSettings: saved })
  } catch {
    return NextResponse.json({ error: 'Failed to save auto top-up settings' }, { status: 500 })
  }
}
