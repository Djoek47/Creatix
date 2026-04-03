'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAdminAudit } from '@/lib/usage/server-log'

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
