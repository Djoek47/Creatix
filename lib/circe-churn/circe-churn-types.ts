/** Shared churn settings row shape (avoid circular imports across persistence helpers). */
export type CirceChurnSettingsRow = {
  user_id: string
  enabled: boolean
  run_cadence: 'off' | 'daily' | 'weekly'
  run_hour_utc: number
  expiring_within_days: number
  stale_interaction_days: number
  include_stale_active: boolean
  max_fans_per_run: number
  notify_on_run_summary: boolean
  notify_when_empty: boolean
  credits_per_run: number
  link_divine_manager_tasks?: boolean
  link_protocol_tasks?: boolean
  tease_future_content?: boolean
  calendar_teaser_notes?: string | null
  last_run_at: string | null
  last_run_error: string | null
  last_digest_excerpt: string | null
  last_digest_markdown?: string | null
  last_digest_at?: string | null
}
