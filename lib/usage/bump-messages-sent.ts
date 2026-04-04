import { createServiceRoleClient } from '@/lib/supabase/server'

/** Best-effort increment of subscriptions.messages_sent for the user. */
export function bumpSubscriptionMessagesSent(userId: string, delta = 1): void {
  const d = Math.max(1, Math.floor(delta))
  const run = async () => {
    try {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('subscriptions')
        .select('messages_sent')
        .eq('user_id', userId)
        .maybeSingle()
      const n = Number((data as { messages_sent?: number } | null)?.messages_sent ?? 0)
      await supabase.from('subscriptions').update({ messages_sent: n + d }).eq('user_id', userId)
    } catch (e) {
      console.warn('[bumpSubscriptionMessagesSent]', e instanceof Error ? e.message : e)
    }
  }
  void run()
}
