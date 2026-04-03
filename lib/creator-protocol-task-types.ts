export type CreatorProtocolTaskStatus = 'pending' | 'executing' | 'done' | 'failed'

export type CreatorProtocolTaskSource = 'manual' | 'webhook' | 'divine'

export type CreatorProtocolTaskRow = {
  id: string
  user_id: string
  title: string
  body: string | null
  status: CreatorProtocolTaskStatus
  source: CreatorProtocolTaskSource
  linked_notification_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
