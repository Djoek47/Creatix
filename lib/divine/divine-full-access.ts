import type { SupabaseClient } from '@supabase/supabase-js'
import { isPaidPlanId } from '@/lib/billing/access'

/** Shown when a tool requires Divine full (paid Pro). */
export const DIVINE_FULL_UPGRADE_MESSAGE =
  'That feature requires a paid Circe et Venus plan. Upgrade in Settings → Subscription to unlock full-app navigation and background leak scans.'

export async function isDivineFullAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; planId: string | null }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle()

  const planId = (subscription as { plan_id?: string | null } | null)?.plan_id
  const normalized = planId?.toLowerCase() || null
  const ok = Boolean(normalized && isPaidPlanId(normalized))
  return { ok, planId: planId ?? null }
}
