import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, Shield, MessageSquare, BarChart3, ArrowRight } from 'lucide-react'

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
        <h2 className="text-3xl font-bold text-gray-800">Notifications</h2>
        <p className="text-lg text-gray-600">Alerts, mentions, and unread messages</p>
      </div>

      <div className="space-y-4">
        <Link
          href="/dashboard/protection"
          className="block bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-purple-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Leak protection & alerts</p>
                <p className="text-sm text-gray-600">
                  {alertCount > 0 ? `${alertCount} item(s) need your attention` : 'No new alerts'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/dashboard/messages"
          className="block bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-purple-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Messages</p>
                <p className="text-sm text-gray-600">
                  {unreadConversations > 0 ? `${unreadConversations} unread conversation(s)` : 'All caught up'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/dashboard/mentions"
          className="block bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-purple-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Reputation & mentions</p>
                <p className="text-sm text-gray-600">
                  {mentions && mentions.length > 0 ? `${mentions.length} mention(s) to review` : 'No new mentions'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>

      {alertCount === 0 && unreadConversations === 0 && (!mentions || mentions.length === 0) && (
        <div className="bg-white/80 backdrop-blur rounded-xl p-8 text-center shadow-sm">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">You're all caught up</p>
          <p className="text-sm text-gray-500 mt-1">New alerts and messages will appear here.</p>
        </div>
      )}
    </div>
  )
}
