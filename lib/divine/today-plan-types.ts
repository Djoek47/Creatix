/** Response shape for GET /api/divine/today-plan */

export type TodayPlanScheduledContent = {
  id: string
  title: string | null
  status: string | null
  scheduled_at: string | null
}

export type TodayPlanProtocolTask = {
  id: string
  title: string
  status: string
  created_at: string
}

export type TodayPlanManagerTask = {
  id: string
  type: string
  status: string
  summary: string
  category: string | null
  created_at: string
}

export type TodayPlanSetupFlags = {
  has_platform_connection: boolean
  manager_mode_on: boolean
  voice_configured: boolean
  beta_acknowledged: boolean
  protocol_task_count: number
}

export type DivineTodayPlanResponse = {
  inbox: {
    notifications_unread: number
    divine_notifications_unread: number
  }
  protection: {
    open_leak_alerts: number
  }
  calendar: {
    scheduled_upcoming: TodayPlanScheduledContent[]
  }
  protocol: {
    open_count: number
    open_tasks: TodayPlanProtocolTask[]
  }
  suggestions: {
    items: TodayPlanManagerTask[]
  }
  setup: TodayPlanSetupFlags
}
