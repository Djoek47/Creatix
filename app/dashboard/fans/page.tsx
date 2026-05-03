import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
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

  const t = await getTranslations('fans')

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
      .select('platform,total_fans,total_follows,date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('fan_thread_insights')
      .select('platform, platform_fan_id, profile_json, thread_snapshot_text, last_seen_fan_message_at')
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

  // OnlyFans + Fansly only — do not sum TikTok/X/Instagram rows from analytics_snapshots
  type SnapRow = { total_fans?: number | null; total_follows?: number | null; date: string }
  const latestOfFl = new Map<string, SnapRow>()
  for (const a of analytics || []) {
    const row = a as SnapRow & { platform?: string }
    const canon = String(row.platform || '').toLowerCase()
    if (canon !== 'onlyfans' && canon !== 'fansly') continue
    const prev = latestOfFl.get(canon)
    if (!prev || new Date(row.date) > new Date(prev.date)) latestOfFl.set(canon, row)
  }
  const snapshotFansByPlatform = {
    onlyfans: latestOfFl.get('onlyfans')?.total_fans ?? 0,
    fansly: latestOfFl.get('fansly')?.total_fans ?? 0,
  }
  const snapshotFollowsByPlatform = {
    onlyfans: latestOfFl.get('onlyfans')?.total_follows ?? 0,
    fansly: latestOfFl.get('fansly')?.total_follows ?? 0,
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t('page.loading')}</div>}>
      <FansPageClient
        initialFans={fans}
        threadInsightsBrief={(insightRows || []) as ThreadInsightBrief[]}
        hasOnlyFansConnected={hasOnlyFansConnected}
        hasFanslyConnected={hasFanslyConnected}
        hasFanPlatformsConnected={hasFanPlatformsConnected}
        snapshotFansByPlatform={snapshotFansByPlatform}
        snapshotFollowsByPlatform={snapshotFollowsByPlatform}
      />
    </Suspense>
  )
}
