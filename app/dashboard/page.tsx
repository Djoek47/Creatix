import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentFans } from '@/components/dashboard/recent-fans'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { PlatformIntegrationWidget } from '@/components/dashboard/platform-integration-widget'
import { SocialReputationWidget } from '@/components/dashboard/social-reputation-widget'
import { OnlyFansNotificationsCard } from '@/components/dashboard/onlyfans-notifications-card'
import { MessageActivity } from '@/components/dashboard/message-activity'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { DashboardCommandTiles } from '@/components/dashboard/dashboard-command-tiles'
import { getDashboardPlanLabel } from '@/lib/dashboard-plan-label'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch dashboard data
  const [
    { data: fans },
    { data: content },
    { data: conversations },
    { data: leakAlerts },
    { data: mentions },
    { data: analytics },
    { data: platformConnections },
    { data: subscription },
  ] = await Promise.all([
    supabase.from('fans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('content').select('*').eq('user_id', user.id).eq('status', 'scheduled'),
    supabase.from('conversations').select('*').eq('user_id', user.id),
    supabase.from('leak_alerts').select('*').eq('user_id', user.id).eq('status', 'detected').limit(5),
    supabase.from('reputation_mentions').select('*').eq('user_id', user.id).eq('is_reviewed', false).limit(5),
    supabase.from('analytics_snapshots').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    supabase.from('platform_connections').select('*').eq('user_id', user.id).eq('is_connected', true),
    supabase
      .from('subscriptions')
      .select('plan_id, status, revenue_band_label, billing_variant')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // Check if user has any connected platforms
  const hasConnectedPlatforms = (platformConnections?.length || 0) > 0

  const planLabel = getDashboardPlanLabel(subscription ?? null)

  // Calculate stats from analytics data - aggregate from both platforms
  const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  
  // Get the latest snapshot for each platform and sum their fans
  type AnalyticsRow = NonNullable<typeof analytics>[number]
  const latestByPlatform = new Map<string, AnalyticsRow>()
  analytics?.forEach(a => {
    if (!latestByPlatform.has(a.platform) || new Date(a.date) > new Date(latestByPlatform.get(a.platform)!.date)) {
      latestByPlatform.set(a.platform, a)
    }
  })
  const totalFans = Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0) || fans?.length || 0
  // Prefer synced platform conversation counts (OnlyFans sync stores `messages_sent` as totalConversations).
  // Fall back to DB conversations table (may be empty if you haven't implemented conversation persistence yet).
  const activeConversations =
    (hasConnectedPlatforms
      ? Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.messages_sent || 0), 0)
      : 0) || conversations?.length || 0
  const scheduledContent = content?.length || 0
  
  // Calculate revenue change (compare last 15 days to previous 15 days)
  const recentRevenue = analytics?.slice(0, 15).reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  const previousRevenue = analytics?.slice(15, 30).reduce((sum, a) => sum + (a.revenue || 0), 0) || 0
  // Only compute % change when we have a real prior period to compare against.
  const revenueChange =
    (analytics?.length || 0) >= 30 && previousRevenue > 0
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
      : null
  
  // Calculate new fans in last 30 days
  const newFansCount = analytics?.reduce((sum, a) => sum + (a.new_fans || 0), 0) || 0

  const stats = {
    totalRevenue,
    revenueChange: revenueChange === null ? null : Math.round(revenueChange * 10) / 10,
    totalFans,
    fansChange: (analytics?.length || 0) >= 30 && totalFans > 0
      ? Math.round((newFansCount / Math.max(totalFans, 1)) * 100 * 10) / 10
      : null,
    activeConversations,
    conversationsChange: null,
    scheduledContent,
    contentChange: null,
    leakAlerts: leakAlerts?.length || 0,
    mentionsToReview: mentions?.length || 0,
    hasConnectedPlatforms,
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <DashboardHero planLabel={planLabel} hasConnectedPlatforms={hasConnectedPlatforms} />

      <DashboardCommandTiles />

      {/* Stats Overview */}
      <StatsCards stats={stats} />

      {/* Standard of Attraction (Pro) */}
      <Card className="overflow-hidden border-gold/35 bg-gradient-to-r from-gold/[0.08] via-amber-500/[0.04] to-transparent shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-serif text-lg text-gold md:text-xl">
              <span className="rounded-lg border border-gold/30 bg-gold/10 p-2">
                <Heart className="h-5 w-5" aria-hidden />
              </span>
              Standard of Attraction
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm">
              Pro-only rating of how commercially attractive your latest photos and videos are, through the eyes of Venus and Circe.
            </CardDescription>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 bg-gradient-to-r from-circe to-venus text-white hover:opacity-90"
          >
            <Link href="/dashboard/ai-studio/tools/standard-of-attraction">
              Open Pro Tool
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChart analytics={analytics || []} hasConnectedPlatforms={hasConnectedPlatforms} />
        </div>

        {/* Quick Actions & Platform Integration */}
        <div className="space-y-4">
          <PlatformIntegrationWidget compact />
          <QuickActions />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Message Activity - Active Conversations */}
        <div className="lg:col-span-1">
          <MessageActivity />
        </div>

        {/* Alerts & Mentions */}
        <div className="space-y-4 lg:col-span-2">
          <AlertsWidget leakAlerts={leakAlerts || []} mentions={mentions || []} />
          <OnlyFansNotificationsCard />
        </div>
      </div>
      
      {/* Recent Fans */}
      <RecentFans fans={fans || []} totalFans={totalFans} />

      {/* Social Media Reputation */}
      <SocialReputationWidget />
    </div>
  )
}
