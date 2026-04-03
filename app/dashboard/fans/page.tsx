import { createClient } from '@/lib/supabase/server'
import { FansPageClient } from '@/components/fans/fans-page-client'
import type { Fan } from '@/lib/types'
import {
  insightRowsToMap,
  mergeThreadInsightsIntoFan,
  type ThreadInsightBrief,
} from '@/lib/fans/merge-fan-audience'
import { normalizeFanFromRow } from '@/lib/fans/normalize-fan-row'

export default async function FansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: rows }, { data: connections }, { data: analytics }, { data: insightRows }] = await Promise.all([
    supabase.from('fans').select('*').eq('user_id', user.id).order('total_spent', { ascending: false }),
    supabase
      .from('platform_connections')
      .select('platform')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .in('platform', ['onlyfans', 'fansly']),
    supabase
      .from('analytics_snapshots')
      .select('platform,total_fans,date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('fan_thread_insights')
      .select('platform, platform_fan_id, profile_json, thread_snapshot_text')
      .eq('user_id', user.id),
  ])

  const insightByKey = insightRowsToMap((insightRows || []) as Parameters<typeof insightRowsToMap>[0])

  const fans: Fan[] = (rows || []).map((row) => {
    const rec = row as Record<string, unknown>
    const fan = normalizeFanFromRow(rec)
    const rawTier = String(rec.subscription_tier ?? rec.tier ?? 'regular')
    return mergeThreadInsightsIntoFan(fan, insightByKey, rawTier)
  })
  const hasFanPlatformsConnected = (connections?.length ?? 0) > 0
  const hasOnlyFansConnected = connections?.some((c: { platform: string }) => c.platform === 'onlyfans') ?? false
  const hasFanslyConnected = connections?.some((c: { platform: string }) => c.platform === 'fansly') ?? false

  // Mirror dashboard logic: derive total fans from the latest snapshot per platform
  const latestByPlatform = new Map<string, { platform: string; total_fans?: number | null; date: string }>()
  ;(analytics || []).forEach((a: any) => {
    if (!latestByPlatform.has(a.platform) || new Date(a.date) > new Date(latestByPlatform.get(a.platform)!.date)) {
      latestByPlatform.set(a.platform, a)
    }
  })
  const analyticsTotalFans =
    Array.from(latestByPlatform.values()).reduce((sum, a) => sum + (a.total_fans || 0), 0) || 0

  return (
    <FansPageClient
      initialFans={fans}
      threadInsightsBrief={(insightRows || []) as ThreadInsightBrief[]}
      hasOnlyFansConnected={hasOnlyFansConnected}
      hasFanslyConnected={hasFanslyConnected}
      hasFanPlatformsConnected={hasFanPlatformsConnected}
      analyticsTotalFans={analyticsTotalFans}
    />
  )
}
