/** Response shape for GET /api/divine/today-plan */

export type TodayPlanScheduledContent = {
  id: string
  title: string | null
  status: string | null
  scheduled_at: string | null
}

export type TodayPlanPlanTask = {
  id: string
  title: string
  body: string | null
  status: string
  plan_date: string
  priority_tier: number
  sort_order: number
  leftover: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export type TodayPlanSetupFlags = {
  has_platform_connection: boolean
  manager_mode_on: boolean
  voice_configured: boolean
  beta_acknowledged: boolean
  protocol_task_count: number
}

export type TodayPlanRetentionSummary = {
  churn_background_enabled: boolean
  last_churn_run_at: string | null
  high_risk_churn_snapshots: number
  hub_path: string
}

export type DivineTodayPlanResponse = {
  inbox: {
    notifications_unread: number
    divine_notifications_unread: number
  }
  protection: {
    open_leak_alerts: number
  }
  retention: TodayPlanRetentionSummary
  calendar: {
    scheduled_upcoming: TodayPlanScheduledContent[]
  }
  /** Single ordered list: protocol tasks for today (all statuses), tier-sorted. */
  plan_tasks: TodayPlanPlanTask[]
  setup: TodayPlanSetupFlags
}
