/** Aligned with POST /api/divine/notification-briefing JSON `items`. */
export type NotificationBriefingItem = {
  notification_id: string
  summary: string
  suggested_action: string
  todos: string[]
}

/** Supabase `notifications.id` (excludes synthetic `of-` / `fs-` pull rows). */
export const CRM_NOTIFICATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
