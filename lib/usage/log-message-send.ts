import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Fire-and-forget audit row for each outbound platform message.
 */
export function logMessageSendEvent(opts: {
  userId: string
  platform: string
  fanId?: string | null
  source: string
  metadata?: Record<string, unknown> | null
}): void {
  const run = async () => {
    try {
      const supabase = createServiceRoleClient()
      await supabase.from('message_send_events').insert({
        user_id: opts.userId,
        platform: opts.platform.slice(0, 32),
        fan_id: opts.fanId != null ? String(opts.fanId).slice(0, 64) : null,
        source: opts.source.slice(0, 64),
        metadata: opts.metadata ?? null,
      })
    } catch (e) {
      console.warn('[logMessageSendEvent]', e instanceof Error ? e.message : e)
    }
  }
  void run()
}
