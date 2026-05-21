import { createClient } from '@/lib/supabase/server'
import { MessagesLayout } from '@/components/messages/messages-layout'
import {
  inboxPlatformFilterOptionsForSubscription,
  type SubscriptionFocusFields,
} from '@/lib/billing/platform-variant'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ fanId?: string; chat?: string; platform?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: platformRows }, { data: subRow }] = await Promise.all([
    supabase
      .from('platform_connections')
      .select('platform')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .in('platform', ['onlyfans', 'fansly']),
    supabase
      .from('subscriptions')
      .select('plan_id,status,billing_variant,billing_focus_platform,billing_focus_platforms')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const inboxPlatformOptions = inboxPlatformFilterOptionsForSubscription(
    subRow as SubscriptionFocusFields | null,
  )

  const connected = new Set((platformRows ?? []).map((r) => r.platform as string))
  const hasOnlyFansConnected = connected.has('onlyfans')
  const hasFanslyConnected = connected.has('fansly')
  const hasFanPlatformConnected = hasOnlyFansConnected || hasFanslyConnected

  const sp = searchParams ? await searchParams : {}
  /** Voice/Divine + notifications use `fanId`; dashboard widgets use `chat` + optional `platform`. */
  const initialFanId = sp.fanId ?? sp.chat
  return (
    <MessagesLayout
      userId={user.id}
      initialFanId={initialFanId}
      initialPlatform={sp.platform}
      hasFanPlatformConnected={hasFanPlatformConnected}
      hasOnlyFansConnected={hasOnlyFansConnected}
      hasFanslyConnected={hasFanslyConnected}
      inboxPlatformOptions={inboxPlatformOptions}
    />
  )
}
