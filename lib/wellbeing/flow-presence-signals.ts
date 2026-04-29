import type { SupabaseClient } from '@supabase/supabase-js'
import { QUIET_DAY_ACTION_THRESHOLD } from '@/lib/wellbeing/flow-presence-heuristic'

/** Heartbeat newer than this is treated as “foreground window” for idle streak / idle drain. */
export const FLOW_HEARTBEAT_FRESH_MS = 5 * 60 * 1000

export type FlowPresenceSignals = {
  hoursSinceLastMeaningfulAction: number | null
  idleStreakApproxMinutes: number
  meaningfulActionsToday: number
  quietDay: boolean
  interactionMedianGapSec: number | null
  /** Worst-case hours since platform sync signal among connected rows (null if unknown). */
  platformStaleHoursMin: number | null
  heartbeatFresh: boolean
}

export const EMPTY_FLOW_PRESENCE_SIGNALS: FlowPresenceSignals = {
  hoursSinceLastMeaningfulAction: null,
  idleStreakApproxMinutes: 0,
  meaningfulActionsToday: 0,
  quietDay: true,
  interactionMedianGapSec: null,
  platformStaleHoursMin: null,
  heartbeatFresh: false,
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function hoursSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, (nowMs - t) / 3_600_000)
}

async function computePlatformStaleHours(
  supabase: SupabaseClient,
  userId: string,
  nowMs: number,
): Promise<number | null> {
  const { data: rows, error } = await supabase
    .from('platform_connections')
    .select('last_sync_at, updated_at, is_connected')
    .eq('user_id', userId)
    .eq('is_connected', true)

  if (error || !rows?.length) return null

  const staleHours: number[] = []
  for (const row of rows) {
    const ts = [row.last_sync_at, row.updated_at]
      .map((s) => (s ? new Date(s).getTime() : NaN))
      .filter((n) => Number.isFinite(n)) as number[]
    if (!ts.length) continue
    const newest = Math.max(...ts)
    staleHours.push(Math.max(0, (nowMs - newest) / 3_600_000))
  }
  if (!staleHours.length) return null
  return Math.max(...staleHours)
}

/**
 * Load persisted dashboard telemetry and derive normalized Flow presence inputs.
 * Idle streak / idle drain require a **fresh heartbeat** so we do not penalize offline sessions.
 */
export async function gatherFlowPresenceSignals(
  supabase: SupabaseClient,
  userId: string,
): Promise<FlowPresenceSignals> {
  const nowMs = Date.now()
  const todayUtc = utcDateKey(new Date(nowMs))

  const [{ data: row, error }, platformStaleHoursMin] = await Promise.all([
    supabase
      .from('user_wellbeing_activity')
      .select(
        'last_heartbeat_at, last_meaningful_action_at, actions_bucket_date, meaningful_actions_count',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    computePlatformStaleHours(supabase, userId, nowMs),
  ])

  if (error) {
    console.warn('[gatherFlowPresenceSignals]', error.message)
    return { ...EMPTY_FLOW_PRESENCE_SIGNALS, platformStaleHoursMin }
  }

  if (!row) {
    return { ...EMPTY_FLOW_PRESENCE_SIGNALS, platformStaleHoursMin }
  }

  const lastHb = row.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : null
  const heartbeatFresh =
    lastHb != null && Number.isFinite(lastHb) && nowMs - lastHb <= FLOW_HEARTBEAT_FRESH_MS

  const lastMa = row.last_meaningful_action_at
  const hoursSinceLastMeaningfulAction = hoursSince(lastMa ?? null, nowMs)

  let idleStreakApproxMinutes = 0
  if (heartbeatFresh && lastMa) {
    const t = new Date(lastMa).getTime()
    if (Number.isFinite(t)) {
      idleStreakApproxMinutes = Math.max(0, (nowMs - t) / 60_000)
    }
  }

  const bucket = row.actions_bucket_date ?? null
  const meaningfulActionsToday =
    bucket === todayUtc ? Math.max(0, Number(row.meaningful_actions_count ?? 0)) : 0

  const quietDay = meaningfulActionsToday < QUIET_DAY_ACTION_THRESHOLD

  return {
    hoursSinceLastMeaningfulAction,
    idleStreakApproxMinutes,
    meaningfulActionsToday,
    quietDay,
    interactionMedianGapSec: null,
    platformStaleHoursMin,
    heartbeatFresh,
  }
}
