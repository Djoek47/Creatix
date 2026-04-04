'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAdminAudit } from '@/lib/usage/server-log'
import { estimateUsdFromTokens, type UnitCostRow } from '@/lib/usage/estimate-cost'

async function assertAdminUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (String((profile as { role?: string } | null)?.role ?? '').toLowerCase() !== 'admin') {
    throw new Error('Forbidden')
  }
  return user.id
}

export type UpdateUnitCostState = { ok?: true; error?: string }

export async function updateAiUnitCostAction(
  _prev: UpdateUnitCostState | null,
  formData: FormData,
): Promise<UpdateUnitCostState> {
  try {
    const adminId = await assertAdminUserId()
    const modelKey = String(formData.get('model_key') ?? '').trim()
    if (!modelKey) return { error: 'Missing model_key' }

    const displayNameRaw = formData.get('display_name')
    const displayName =
      displayNameRaw === null || displayNameRaw === undefined ? null : String(displayNameRaw).trim() || null

    const inUsd = Number(formData.get('usd_per_1m_input'))
    const outUsd = Number(formData.get('usd_per_1m_output'))
    if (!Number.isFinite(inUsd) || !Number.isFinite(outUsd) || inUsd < 0 || outUsd < 0) {
      return { error: 'Invalid rates' }
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('ai_unit_costs')
      .update({
        display_name: displayName,
        usd_per_1m_input: inUsd,
        usd_per_1m_output: outUsd,
        updated_at: new Date().toISOString(),
        effective_from: new Date().toISOString(),
      })
      .eq('model_key', modelKey)

    if (error) return { error: error.message }

    await logAdminAudit({
      adminUserId: adminId,
      action: 'ai_unit_costs.update',
      payload: { model_key: modelKey, usd_per_1m_input: inUsd, usd_per_1m_output: outUsd },
    })
    revalidatePath('/admin/settings')
    revalidatePath('/admin/costs')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save' }
  }
}

export type RecalculateTelemetryState = {
  ok?: true
  error?: string
  scanned?: number
  updated?: number
  /** True if more rows may need work — run again (processes newest events first). */
  moreRemaining?: boolean
}

const DEFAULT_COST_FALLBACK: UnitCostRow = {
  model_key: 'default',
  usd_per_1m_input: 0.5,
  usd_per_1m_output: 2.0,
}

function buildUnitCostMap(
  rows: { model_key: string; usd_per_1m_input: number; usd_per_1m_output: number }[] | null,
): Map<string, UnitCostRow> {
  const m = new Map<string, UnitCostRow>()
  for (const r of rows ?? []) {
    m.set(String(r.model_key), {
      model_key: String(r.model_key),
      usd_per_1m_input: Number(r.usd_per_1m_input),
      usd_per_1m_output: Number(r.usd_per_1m_output),
    })
  }
  return m
}

function resolveCostRow(model: string, costMap: Map<string, UnitCostRow>): UnitCostRow {
  const key = model.trim()
  return costMap.get(key) ?? costMap.get('default') ?? DEFAULT_COST_FALLBACK
}

/**
 * Recompute estimated_usd + total_tokens on recent ai_usage_events using current ai_unit_costs.
 * Does not pull external provider APIs — refreshes derived numbers in Supabase for all users’ events.
 */
export async function recalculateAiTelemetryAction(
  _prev: RecalculateTelemetryState | null,
  _formData: FormData,
): Promise<RecalculateTelemetryState> {
  try {
    const adminId = await assertAdminUserId()
    const supabase = createServiceRoleClient()

    const { data: costRows, error: costErr } = await supabase
      .from('ai_unit_costs')
      .select('model_key, usd_per_1m_input, usd_per_1m_output')

    if (costErr) return { error: costErr.message }

    const costMap = buildUnitCostMap(
      costRows as { model_key: string; usd_per_1m_input: number; usd_per_1m_output: number }[] | null,
    )

    const SCAN_LIMIT = 3000
    const UPDATE_CAP = 1200

    const { data: events, error: evErr } = await supabase
      .from('ai_usage_events')
      .select('id, model, input_tokens, output_tokens, estimated_usd, total_tokens')
      .order('created_at', { ascending: false })
      .limit(SCAN_LIMIT)

    if (evErr) return { error: evErr.message }

    let scanned = 0
    let updated = 0

    for (const row of events ?? []) {
      scanned++

      const r = row as {
        id: string
        model: string
        input_tokens?: number | null
        output_tokens?: number | null
        estimated_usd?: number | string | null
        total_tokens?: number | null
      }

      const inT = Math.max(0, Math.floor(Number(r.input_tokens ?? 0)))
      const outT = Math.max(0, Math.floor(Number(r.output_tokens ?? 0)))
      const totalT = inT + outT
      const unit = resolveCostRow(String(r.model ?? ''), costMap)
      const est = estimateUsdFromTokens(inT, outT, unit)
      const oldEst = Number(r.estimated_usd ?? 0)
      const oldTotal = Number(r.total_tokens ?? 0)

      if (Math.abs(oldEst - est) < 1e-9 && oldTotal === totalT) continue
      if (updated >= UPDATE_CAP) break

      const { error: upErr } = await supabase
        .from('ai_usage_events')
        .update({ estimated_usd: est, total_tokens: totalT })
        .eq('id', r.id)

      if (!upErr) updated++
    }

    const moreRemaining = scanned >= SCAN_LIMIT || updated >= UPDATE_CAP

    await logAdminAudit({
      adminUserId: adminId,
      action: 'ai_usage_events.recalculate_telemetry',
      payload: { scanned, updated, more_remaining: moreRemaining },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/users')
    revalidatePath('/admin/settings')

    return {
      ok: true,
      scanned,
      updated,
      moreRemaining,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to recalculate' }
  }
}
