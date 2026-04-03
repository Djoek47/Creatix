export type CreatorProtocolTaskStatus = 'pending' | 'executing' | 'done' | 'failed'

export type CreatorProtocolTaskSource = 'manual' | 'webhook' | 'divine'

/** 1 notifications → 2 inbox/DMs → 3 protection → 4 content/visibility */
export type CreatorProtocolPriorityTier = 1 | 2 | 3 | 4

export const PRIORITY_TIER_LABELS: Record<CreatorProtocolPriorityTier, string> = {
  1: 'Notifications',
  2: 'Messages',
  3: 'Protection',
  4: 'Content',
}

export function isLeftoverTask(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.leftover_from_previous_day === true
}

export type CreatorProtocolTaskRow = {
  id: string
  user_id: string
  title: string
  body: string | null
  status: CreatorProtocolTaskStatus
  source: CreatorProtocolTaskSource
  linked_notification_id: string | null
  metadata: Record<string, unknown>
  /** UTC plan day (YYYY-MM-DD); optional until migration 051 applied. */
  plan_date?: string
  priority_tier?: number
  sort_order?: number
  created_at: string
  updated_at: string
}
