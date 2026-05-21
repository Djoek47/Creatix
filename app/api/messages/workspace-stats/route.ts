import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

type DmCacheRow = {
  platform_fan_id: string
  message_created_at: string
  payload: Record<string, unknown> | null
}

type ResponseMetrics = {
  respondedCount: number
  totalInboundCount: number
  averageResponseSeconds: number | null
}

function getMessageTimestamp(row: DmCacheRow): number {
  const rawCreated =
    typeof row.payload?.createdAt === 'string' && row.payload.createdAt
      ? row.payload.createdAt
      : row.message_created_at
  const t = Date.parse(rawCreated)
  return Number.isNaN(t) ? 0 : t
}

function getFromUserId(row: DmCacheRow): string {
  const from = row.payload?.fromUser
  if (!from || typeof from !== 'object') return ''
  const id = (from as Record<string, unknown>).id
  return id == null ? '' : String(id)
}

function computeResponseMetrics(rows: DmCacheRow[]): ResponseMetrics {
  if (rows.length === 0) {
    return { respondedCount: 0, totalInboundCount: 0, averageResponseSeconds: null }
  }

  const sorted = [...rows].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))
  const pendingInboundByFan = new Map<string, number>()
  let respondedCount = 0
  let totalInboundCount = 0
  let totalResponseSeconds = 0

  for (const row of sorted) {
    const fanId = String(row.platform_fan_id || '')
    if (!fanId) continue
    const ts = getMessageTimestamp(row)
    if (ts <= 0) continue
    const senderId = getFromUserId(row)
    const isInbound = senderId === fanId

    if (isInbound) {
      totalInboundCount += 1
      if (!pendingInboundByFan.has(fanId)) pendingInboundByFan.set(fanId, ts)
      continue
    }

    const pendingTs = pendingInboundByFan.get(fanId)
    if (pendingTs != null && ts > pendingTs) {
      respondedCount += 1
      totalResponseSeconds += Math.max(0, Math.round((ts - pendingTs) / 1000))
      pendingInboundByFan.delete(fanId)
    }
  }

  return {
    respondedCount,
    totalInboundCount,
    averageResponseSeconds:
      respondedCount > 0 ? Math.round(totalResponseSeconds / respondedCount) : null,
  }
}

function formatSecondsShort(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  if (minutes < 60) return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`
}

function latestDmTimestampMs(rows: DmCacheRow[]): number {
  let max = 0
  for (const row of rows) {
    const t = getMessageTimestamp(row)
    if (t > max) max = t
  }
  return max
}

/** Prefer the more recent of CRM last touch and latest cached DM (thread may be ahead of CRM sync). */
function pickLastActiveIso(crmIso: string | null | undefined, rows: DmCacheRow[]): string | null {
  const dmMax = latestDmTimestampMs(rows)
  const crmMs = crmIso ? Date.parse(crmIso) : NaN
  const crmT = Number.isNaN(crmMs) ? 0 : crmMs
  if (dmMax <= 0 && crmT <= 0) return null
  if (dmMax >= crmT) return new Date(dmMax).toISOString()
  return new Date(crmT).toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const fanId = searchParams.get('fanId')?.trim() || ''
    const platformRaw = (searchParams.get('platform')?.trim() || 'onlyfans').toLowerCase()
    const platformNorm = platformRaw === 'fansly' ? 'fansly' : 'onlyfans'
    /** OnlyFans DM cache is keyed by OF fan ids — never query it for Fansly threads. */
    const useOfDmCacheForFan = Boolean(fanId) && platformNorm === 'onlyfans'
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startOfDayIso = startOfDay.toISOString()
    const recentWindowIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [
      fansCountRes,
      highValueRes,
      creatorSignalRes,
      dmRecentRes,
      dmTodayRes,
      selectedFanRes,
      selectedFanDmRes,
    ] = await Promise.all([
      supabase
        .from('fans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('platform', ['onlyfans', 'fansly']),
      supabase
        .from('fans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('total_spent', 100),
      supabase
        .from('fans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('creator_classification', 'is', null),
      supabase
        .from('onlyfans_dm_message_cache')
        .select('platform_fan_id,message_created_at,payload')
        .eq('user_id', user.id)
        .gte('message_created_at', recentWindowIso)
        .order('message_created_at', { ascending: true })
        .limit(4000),
      supabase
        .from('onlyfans_dm_message_cache')
        .select('onlyfans_message_id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('message_created_at', startOfDayIso),
      fanId
        ? supabase
            .from('fans')
            .select(
              'platform,platform_fan_id,username,display_name,avatar_url,total_spent,subscription_tier,last_interaction_at,first_subscribed_at,subscription_start,spend_subscriptions,spend_tips,spend_messages,spend_posts,tags',
            )
            .eq('user_id', user.id)
            .eq('platform', platformNorm)
            .eq('platform_fan_id', fanId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      fanId
        ? supabase
            .from('onlyfans_dm_message_cache')
            .select('platform_fan_id,message_created_at,payload')
            .eq('user_id', user.id)
            .eq('platform_fan_id', fanId)
            .order('message_created_at', { ascending: true })
            .limit(1500)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (dmRecentRes.error) {
      return NextResponse.json({ error: dmRecentRes.error.message }, { status: 500 })
    }

    const recentRows = (dmRecentRes.data ?? []) as DmCacheRow[]
    const globalMetrics = computeResponseMetrics(recentRows)
    const responseRatePct =
      globalMetrics.totalInboundCount > 0
        ? Math.round((globalMetrics.respondedCount / globalMetrics.totalInboundCount) * 100)
        : 0

    const selectedFan = selectedFanRes.data as
      | {
          platform: string
          platform_fan_id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          total_spent: number | null
          subscription_tier: string | null
          last_interaction_at: string | null
          first_subscribed_at: string | null
          subscription_start: string | null
          spend_subscriptions: number | null
          spend_tips: number | null
          spend_messages: number | null
          spend_posts: number | null
          tags: string[] | null
        }
      | null

    const selectedFanRows = (selectedFanDmRes.data ?? []) as DmCacheRow[]
    const fanMetrics = computeResponseMetrics(selectedFanRows)
    const fanResponsePct =
      fanMetrics.totalInboundCount > 0
        ? Math.round((fanMetrics.respondedCount / fanMetrics.totalInboundCount) * 100)
        : null

    const spendRows = selectedFan
      ? [
          { id: 'subscriptions', label: 'Subscription revenue', amount: Number(selectedFan.spend_subscriptions) || 0 },
          { id: 'tips', label: 'Tips', amount: Number(selectedFan.spend_tips) || 0 },
          { id: 'dm_ppv', label: 'DM PPV', amount: Number(selectedFan.spend_messages) || 0 },
          { id: 'feed_ppv', label: 'Feed PPV', amount: Number(selectedFan.spend_posts) || 0 },
        ]
          .filter((row) => row.amount > 0)
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3)
      : []

    const recentOrdersPayload = spendRows.map((row) => ({
      id: row.id,
      title: row.label,
      amount: row.amount,
    }))

    const lastActiveForFan = pickLastActiveIso(selectedFan?.last_interaction_at, selectedFanRows)

    const fanContext =
      fanId.length > 0
        ? {
            fanId,
            platform: platformNorm,
            username: selectedFan?.username ?? null,
            displayName: selectedFan?.display_name ?? null,
            avatarUrl: selectedFan?.avatar_url ?? null,
            totalSpent: selectedFan ? Number(selectedFan.total_spent ?? 0) : 0,
            subscriptionTier: selectedFan?.subscription_tier ?? null,
            memberSince: selectedFan?.first_subscribed_at || selectedFan?.subscription_start || null,
            lastActive: lastActiveForFan,
            totalMessages: useOfDmCacheForFan ? selectedFanRows.length : null,
            responseRate: useOfDmCacheForFan ? fanResponsePct : null,
            avgResponseTimeSeconds: useOfDmCacheForFan ? fanMetrics.averageResponseSeconds : null,
            avgResponseTimeLabel: useOfDmCacheForFan ? formatSecondsShort(fanMetrics.averageResponseSeconds) : null,
            tags: selectedFan?.tags ?? [],
            recentOrders: recentOrdersPayload,
          }
        : null

    return NextResponse.json({
      kpis: {
        totalConversations: Number(fansCountRes.count ?? 0),
        responseRate: responseRatePct,
        avgResponseTimeSeconds: globalMetrics.averageResponseSeconds,
        avgResponseTimeLabel: formatSecondsShort(globalMetrics.averageResponseSeconds),
        messagesToday: Number(dmTodayRes.count ?? 0),
      },
      customTags: [
        { id: 'high-value', label: 'High-value fans', value: Number(highValueRes.count ?? 0), enabled: true },
        { id: 'creator-signal', label: 'Creator signals', value: Number(creatorSignalRes.count ?? 0), enabled: true },
      ],
      fanContext,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load workspace stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
