/** Quiet-day relief applies when today's meaningful action count is below this threshold (UTC bucket). */
export const QUIET_DAY_ACTION_THRESHOLD = 4

/** Idle streak must exceed this (minutes) before foreground idle drain applies (requires fresh heartbeat). */
export const IDLE_DRAIN_THRESHOLD_MIN = 12

/** Ramp away-recovery energy bonus starting after this many hours since last meaningful action. */
export const AWAY_RECOVERY_MIN_HOURS = 3

/** Curve saturates by this many hours for away-recovery bonus. */
export const AWAY_RECOVERY_SATURATION_HOURS = 42

/** Max positive energy adjustment from away recovery (applied before idle drain). */
export const AWAY_RECOVERY_MAX_DELTA = 14

/** Max energy subtracted per pulse/heuristic call from idle drain (pulse TTL avoids cliffs). */
export const IDLE_DRAIN_MAX_PENALTY = 8

/**
 * Energy bonus from time away from substantive dashboard interaction (hours since last meaningful action).
 * Offline users still get credit via `last_meaningful_action_at` without a fresh heartbeat.
 */
export function awayRecoveryEnergyBonus(hoursSinceLastMeaningfulAction: number | null): number {
  if (hoursSinceLastMeaningfulAction == null || !Number.isFinite(hoursSinceLastMeaningfulAction)) return 0
  const h = Math.max(0, hoursSinceLastMeaningfulAction)
  if (h < AWAY_RECOVERY_MIN_HOURS) return 0
  const span = Math.max(1e-6, AWAY_RECOVERY_SATURATION_HOURS - AWAY_RECOVERY_MIN_HOURS)
  const t = Math.min(1, (Math.min(AWAY_RECOVERY_SATURATION_HOURS, h) - AWAY_RECOVERY_MIN_HOURS) / span)
  return Math.round(AWAY_RECOVERY_MAX_DELTA * t * t)
}

/** Negative delta (penalty) applied to energy when foreground + idle streak exceeds threshold. */
export function idleDrainEnergyPenalty(idleStreakApproxMinutes: number, heartbeatFresh: boolean): number {
  if (!heartbeatFresh) return 0
  if (!Number.isFinite(idleStreakApproxMinutes)) return 0
  if (idleStreakApproxMinutes < IDLE_DRAIN_THRESHOLD_MIN) return 0
  const excess = idleStreakApproxMinutes - IDLE_DRAIN_THRESHOLD_MIN
  return Math.min(IDLE_DRAIN_MAX_PENALTY, Math.round(excess * 0.14))
}

/** Multiplier for stress when the user has logged few meaningful actions today (UTC). */
export function quietDayStressMultiplier(meaningfulActionsToday: number): number {
  return meaningfulActionsToday < QUIET_DAY_ACTION_THRESHOLD ? 0.92 : 1
}

export type FocusTempoArgs = {
  idleStreakApproxMinutes: number
  heartbeatFresh: boolean
  interactionMedianGapSec: number | null
  compositePressure: number
}

/** Bounded adjustment layered onto heuristic focus after base computation. */
export function focusTempoAdjustment(args: FocusTempoArgs): number {
  let delta = 0
  if (args.interactionMedianGapSec != null && Number.isFinite(args.interactionMedianGapSec)) {
    const gap = Math.min(480, Math.max(8, args.interactionMedianGapSec))
    delta += Math.round(96 / gap - 6)
  } else if (args.heartbeatFresh) {
    if (args.idleStreakApproxMinutes < 10) delta += 5
    else if (args.idleStreakApproxMinutes > 40) delta -= 7
  }
  delta -= Math.round(args.compositePressure * 0.025)
  return Math.max(-12, Math.min(12, delta))
}

/** Mild stress relief when connected platforms look stale (optional signal E). */
export function platformStaleStressMultiplier(platformStaleHours: number | null): number {
  if (platformStaleHours == null || !Number.isFinite(platformStaleHours)) return 1
  if (platformStaleHours < 72) return 1
  return 0.97
}
