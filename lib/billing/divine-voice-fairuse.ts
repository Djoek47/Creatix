import { createServiceRoleClient } from '@/lib/supabase/server'

/** Must match `logUsageEvent` / `divine-manager-realtime` route `feature` for session starts. */
const FEATURE = 'divine-manager-realtime-session'

/**
 * If `DIVINE_VOICE_MAX_REALTIME_SESSIONS_PER_MONTH` is a positive number, cap session starts
 * per calendar month (UTC) using `ai_usage_events` with `feature = divine_manager_realtime_session`.
 * Set to 0 (default) to disable.
 */
export async function checkDivineVoiceRealtimeMonthCap(
  userId: string,
): Promise<{ ok: true } | { ok: false; code: 'divine_voice_fair_use_exceeded' }> {
  const cap = Math.max(0, Math.floor(Number(process.env.DIVINE_VOICE_MAX_REALTIME_SESSIONS_PER_MONTH || '0')))
  if (cap <= 0) return { ok: true }

  const supabase = createServiceRoleClient()
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('ai_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', FEATURE)
    .gte('created_at', start.toISOString())

  if (error) {
    console.warn('[divine-voice-fairuse]', error.message)
    return { ok: true }
  }
  const n = count ?? 0
  if (n >= cap) {
    return { ok: false, code: 'divine_voice_fair_use_exceeded' }
  }
  return { ok: true }
}
