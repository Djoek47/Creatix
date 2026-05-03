/** Feature slugs persisted on openai_jobs.feature (matches handler registry keys). */
export const OPENAI_JOB_FEATURES = [
  'divine_thread_scan',
  'ai_chatter',
  'mass_dm_composer',
  'briefing_script',
  'churn_run',
  'mimic_test',
] as const

export type OpenaiJobFeature = (typeof OPENAI_JOB_FEATURES)[number]

export type OpenaiJobRow = {
  id: string
  user_id: string
  response_id: string | null
  feature: string
  model: string
  status: string
  error_code: string | null
  error_message: string | null
  divine_manager_task_id: string | null
  request_metadata: Record<string, unknown>
  result_summary: Record<string, unknown> | null
}
