/** Server-side minimum spacing between persisted heartbeats (compare `last_heartbeat_at`). */
export const WELLBEING_ACTIVITY_HEARTBEAT_MIN_INTERVAL_MS = 90_000

/**
 * Meaningful dashboard interactions (no free-text). Sent from the shell reporter or future surfaces.
 * UTC day bucket for counters is applied server-side.
 */
export const MEANINGFUL_ACTION_KINDS = ['navigation', 'pathname_change', 'primary_click'] as const

export type MeaningfulActionKind = (typeof MEANINGFUL_ACTION_KINDS)[number]

export function isMeaningfulActionKind(value: unknown): value is MeaningfulActionKind {
  return typeof value === 'string' && (MEANINGFUL_ACTION_KINDS as readonly string[]).includes(value)
}
