import type { SupabaseClient } from '@supabase/supabase-js'

/** UTC date string YYYY-MM-DD (aligned with plan_date column). */
export function utcPlanDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Bumps incomplete tasks from past plan days to today and marks them as leftovers in metadata.
 */
export async function runProtocolPlanRollover(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ rolled: number }> {
  const today = utcPlanDateString()

  const { data: stale, error: qErr } = await supabase
    .from('creator_protocol_tasks')
    .select('id, metadata')
    .eq('user_id', userId)
    .lt('plan_date', today)
    .in('status', ['pending', 'executing'])

  if (qErr || !stale?.length) {
    return { rolled: 0 }
  }

  let rolled = 0
  const now = new Date().toISOString()

  for (const row of stale) {
    const prev =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const nextMeta = {
      ...prev,
      leftover_from_previous_day: true,
    }
    const { error: upErr } = await supabase
      .from('creator_protocol_tasks')
      .update({
        plan_date: today,
        metadata: nextMeta,
        updated_at: now,
      })
      .eq('id', row.id)
      .eq('user_id', userId)

    if (!upErr) rolled += 1
  }

  return { rolled }
}
