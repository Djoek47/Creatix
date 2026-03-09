import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, Shield, MessageSquare, BarChart3, CreditCard, ArrowRight } from 'lucide-react'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [
    { data: leakAlerts },
    { data: mentions },
    { data: conversations },
  ] = await Promise.all([
    supabase.from('leak_alerts').select('*').eq('user_id', user.id).eq('status', 'detected').order('detected_at', { ascending: false }).limit(10),
    supabase.from('reputation_mentions').select('*').eq('user_id', user.id).eq('is_reviewed', false).order('detected_at', { ascending: false }).limit(10),
    supabase.from('conversations').select('*').eq('user_id', user.id).gt('unread_count', 0).order('last_message_at', { ascending: false }).limit(5),
  ])

  const alertCount = (leakAlerts?.length ?? 0) + (mentions?.length ?? 0)
  const unreadConversations = conversations?.length ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="font-title text-3xl font-bold text-foreground">Notifications</h2>
        <p className="text-lg text-muted-foreground">Alerts, mentions, and unread messages</p>
      </div>

      <div className="space-y-4">
        <Link href="/dashboard/protection" className="block brand-card p-4 transition hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Leak protection & alerts</p>
                <p className="text-sm text-muted-foreground">
                  {alertCount > 0 ? `${alertCount} item(s) need your attention` : 'No new alerts'}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        <Link href="/dashboard/messages" className="block brand-card p-4 transition hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Messages</p>
                <p className="text-sm text-muted-foreground">
                  {unreadConversations > 0 ? `${unreadConversations} unread conversation(s)` : 'All caught up'}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        <Link href="/dashboard/mentions" className="block brand-card p-4 transition hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Reputation & mentions</p>
                <p className="text-sm text-muted-foreground">
                  {mentions && mentions.length > 0 ? `${mentions.length} mention(s) to review` : 'No new mentions'}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        <Link href="/dashboard/settings" className="block brand-card p-4 transition hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/20 text-chart-3">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Billing & security</p>
                <p className="text-sm text-muted-foreground">
                  Manage subscription, payment method, and billing notifications
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {alertCount === 0 && unreadConversations === 0 && (!mentions || mentions.length === 0) && (
        <div className="brand-card p-8 text-center">
          <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="font-medium text-foreground">You're all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">New alerts and messages will appear here.</p>
        </div>
      )}
    </div>
  )
}
