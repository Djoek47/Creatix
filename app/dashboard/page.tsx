import { createClient } from '@/lib/supabase/server'
import { WelcomeSection } from '@/components/dashboard/welcome-section'
import { DashboardProfileCard } from '@/components/dashboard/dashboard-profile-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [
    { data: profile },
    { data: fans },
    { data: content },
    { data: conversations },
    { data: leakAlerts },
    { data: mentions },
    { data: analytics },
    { data: connections },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('fans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('content').select('*').eq('user_id', user.id).eq('status', 'scheduled'),
    supabase.from('conversations').select('*').eq('user_id', user.id),
    supabase.from('leak_alerts').select('*').eq('user_id', user.id).eq('status', 'detected').limit(5),
    supabase.from('reputation_mentions').select('*').eq('user_id', user.id).eq('is_reviewed', false).limit(5),
    supabase.from('analytics_snapshots').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    supabase.from('platform_connections').select('platform').eq('user_id', user.id).eq('is_connected', true),
  ])

  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  const totalFans = fans?.length ?? 0
  const activeConversations = conversations?.length ?? 0
  const scheduledContent = content?.length ?? 0
  const userName = profile?.full_name || user.email?.split('@')[0] || 'Creator'
  const connectedPlatforms = (connections ?? []).map((c) => c.platform)

  const progress = [
    { label: 'Revenue', value: totalRevenue, max: 10000, revenue: true },
    { label: 'Fans', value: totalFans, max: 500 },
    { label: 'Messages', value: activeConversations, max: 100 },
    { label: 'Content', value: scheduledContent, max: 50 },
  ]
  const kpis = [
    { label: 'Total fans', value: totalFans },
    { label: 'Active conversations', value: activeConversations },
    { label: 'Scheduled posts', value: scheduledContent, revenue: false },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <WelcomeSection userName={userName} progress={progress} kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block space-y-4">
          <DashboardProfileCard
            profile={profile}
            totalRevenue={totalRevenue}
            connectedPlatforms={connectedPlatforms}
          />
        </aside>

        <div className="space-y-6 min-w-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart analytics={analytics || []} />
            </div>
            <QuickActions />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentFans fans={fans || []} />
            <AlertsWidget leakAlerts={leakAlerts || []} mentions={mentions || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
