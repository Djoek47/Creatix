import { createClient } from '@/lib/supabase/server'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { DashboardCommandTiles } from '@/components/dashboard/dashboard-command-tiles'
import { DashboardWidgetsGrid } from '@/components/dashboard/dashboard-widgets-grid'
import { DashboardCommandCenter } from '@/components/dashboard/dashboard-command-center'
import { getDashboardPlanLabel } from '@/lib/dashboard-plan-label'
import { extractDashboardPreset } from '@/lib/dashboard/dashboard-preset'
import { resolveWorkspaceCapabilities } from '@/lib/plan-capabilities'
import { shouldShowDivineTrialStartCard } from '@/lib/billing/access'

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
    { data: divineRow },
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
      .select(
        'plan_id, status, revenue_band_label, billing_variant, billing_focus_platform, billing_focus_platforms, revenue_tier, stripe_subscription_id, trial_ends_at, current_period_end',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('divine_manager_settings').select('automation_rules').eq('user_id', user.id).maybeSingle(),
  ])

  const dashboardPreset = extractDashboardPreset(divineRow?.automation_rules ?? null)

  // Check if user has any connected platforms
  const hasConnectedPlatforms = (platformConnections?.length || 0) > 0
  const connectedOnlyFans = platformConnections?.some((c) => c.platform === 'onlyfans') ?? false
  const connectedFansly = platformConnections?.some((c) => c.platform === 'fansly') ?? false

  const planLabel = getDashboardPlanLabel(subscription ?? null)
  const revenueTier =
    subscription && typeof subscription.revenue_tier === 'number' ? subscription.revenue_tier : null
  const workspaceCaps = resolveWorkspaceCapabilities(subscription ?? null)
  const showStartTrialBillingCta =
    !workspaceCaps.isNonApiProtectionTier && shouldShowDivineTrialStartCard(subscription ?? null)

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
    <DashboardCommandCenter
      tierIndex={revenueTier}
      preset={dashboardPreset}
      hero={
        <DashboardHero
          planLabel={planLabel}
          hasConnectedPlatforms={hasConnectedPlatforms}
          mood={dashboardPreset?.mood}
          accent={dashboardPreset?.accent}
          tierIndex={revenueTier}
          nonApiProtectionTier={workspaceCaps.isNonApiProtectionTier}
          showStartTrialBillingCta={showStartTrialBillingCta}
        />
      }
      commandStrip={
        <DashboardCommandTiles
          accent={dashboardPreset?.accent}
          tierIndex={revenueTier}
          nonApiProtectionTier={workspaceCaps.isNonApiProtectionTier}
        />
      }
      widgetRegion={
        <DashboardWidgetsGrid
          userId={user.id}
          dashboardPreset={dashboardPreset}
          stats={stats}
          analytics={analytics || []}
          hasConnectedPlatforms={hasConnectedPlatforms}
          connectedOnlyFans={connectedOnlyFans}
          connectedFansly={connectedFansly}
          fans={fans || []}
          totalFans={totalFans}
          leakAlerts={leakAlerts || []}
          mentions={mentions || []}
          nonApiProtectionTier={workspaceCaps.isNonApiProtectionTier}
        />
      }
    />
  )
}
