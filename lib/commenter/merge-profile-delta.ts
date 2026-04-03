import type { SupabaseClient } from '@supabase/supabase-js'

type LooseSb = SupabaseClient<any, 'public', any, any>

/**
 * Append comment-derived signals into fan_thread_insights.profile_json without clobbering thread merge.
 */
export async function mergeCommentDeltaIntoFanProfile(
  supabase: LooseSb,
  userId: string,
  platform: string,
  platformFanId: string,
  delta: { signals_from_comments?: string[]; notes?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: selErr } = await supabase
    .from('fan_thread_insights')
    .select('profile_json, iteration')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()

  if (selErr) return { ok: false, error: selErr.message }

  const prev =
    row && typeof (row as { profile_json?: unknown }).profile_json === 'object' && (row as { profile_json?: unknown }).profile_json !== null
      ? ({ ...((row as { profile_json: Record<string, unknown> }).profile_json as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>)

  const existingSignals = Array.isArray(prev.signals_from_comments)
    ? (prev.signals_from_comments as string[])
    : []
  const add = (delta.signals_from_comments ?? []).map((s) => String(s).trim()).filter(Boolean)
  const mergedSignals = [...new Set([...existingSignals, ...add])].slice(-40)

  prev.signals_from_comments = mergedSignals
  if (delta.notes?.trim()) {
    const prior = typeof prev.comment_insights_notes === 'string' ? prev.comment_insights_notes : ''
    prev.comment_insights_notes = [prior, delta.notes.trim()].filter(Boolean).join(' | ').slice(0, 2000)
  }

  const iteration = (row as { iteration?: number } | null)?.iteration ?? 0
  const now = new Date().toISOString()

  const { error: upErr } = await supabase.from('fan_thread_insights').upsert(
    {
      user_id: userId,
      platform,
      platform_fan_id: platformFanId,
      profile_json: prev,
      updated_at: now,
      last_update_at: now,
      iteration: iteration + 1,
    },
    { onConflict: 'user_id,platform,platform_fan_id' },
  )

  if (upErr) return { ok: false, error: upErr.message }
  return { ok: true }
}
