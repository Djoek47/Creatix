import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createFanslyAPI } from '@/lib/fansly-api'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'

// GET: Fetch revenue data from all connected platform APIs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all connected platforms
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    const result = {
      stats: {
        totalRevenue: 0,
        revenueChange: 0,
        totalFans: 0,
        fansChange: 0,
        earnings: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0,
        },
        breakdown: {
          subscriptions: 0,
          tips: 0,
          messages: 0,
          posts: 0,
        }
      },
      chartData: [] as { date: string; revenue: number; platform: string }[],
      platforms: {} as Record<string, { revenue: number; fans: number; username: string }>,
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json(result)
    }

    const hasAdultPlatform = connections.some(
      (c) => c.platform === 'onlyfans' || c.platform === 'fansly',
    )
    if (hasAdultPlatform) {
      const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
      if (billingBlock) return billingBlock
    }

    // Fetch data from each connected platform
    for (const connection of connections) {
      if (connection.platform === 'onlyfans') {
        try {
          const accountId = connection.access_token
          if (!accountId) continue
          const api = createOnlyFansAPI(accountId)
          
          // Fetch earnings
          const earnings = await api.getEarnings()
          
          result.stats.totalRevenue += earnings.total || 0
          result.stats.breakdown.subscriptions += earnings.subscriptions || 0
          result.stats.breakdown.tips += earnings.tips || 0
          result.stats.breakdown.messages += earnings.messages || 0
          result.stats.breakdown.posts += earnings.posts || 0

          // Fetch stats (fans count)
          const stats = await api.getStats()
          
          result.stats.totalFans += stats.fans?.total || 0
          result.stats.earnings.today += stats.earnings?.today || 0
          result.stats.earnings.thisWeek += stats.earnings?.thisWeek || 0
          result.stats.earnings.thisMonth += stats.earnings?.thisMonth || 0
          result.stats.earnings.total += stats.earnings?.total || 0

          // Fetch chart data (last 30 days)
          const chartResponse = await api.getEarningsChart({ days: 30 })
          
          if (chartResponse.data) {
            chartResponse.data.forEach((point) => {
              result.chartData.push({
                date: point.date,
                revenue: point.amount,
                platform: 'onlyfans',
              })
            })
          }

          // Store platform-specific data
          result.platforms['onlyfans'] = {
            revenue: earnings.total || 0,
            fans: stats.fans?.total || 0,
            username: connection.platform_username || '',
          }

          // Update the connection with latest sync
          await supabase
            .from('platform_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', connection.id)

        } catch (error) {
          console.error('OnlyFans API error:', error)
          // Continue with other platforms even if one fails
        }
      }

      if (connection.platform === 'fansly') {
        try {
          const accountId = connection.access_token ?? connection.platform_user_id
          if (!accountId) {
            result.platforms['fansly'] = {
              revenue: 0,
              fans: 0,
              username: connection.platform_username || '',
            }
            continue
          }

          const api = createFanslyAPI(String(accountId))
          const now = new Date()
          const todayYmd = now.toISOString().slice(0, 10)
          const monthStartYmd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
            .toISOString()
            .slice(0, 10)
          const dow = now.getUTCDay()
          const mondayOffset = dow === 0 ? -6 : 1 - dow
          const weekStart = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset),
          )
          const weekStartYmd = weekStart.toISOString().slice(0, 10)

          const [profile, earningsDefault, earningsMtd, earningsToday, earningsWeek] =
            await Promise.all([
              api.getProfile(String(accountId)).catch(() => null),
              api.getEarnings(String(accountId)).catch(() => ({
                total: 0,
                subscriptions: 0,
                tips: 0,
                messages: 0,
                period: { start: '', end: '' },
              })),
              api
                .getEarnings(String(accountId), { startDate: monthStartYmd, endDate: todayYmd })
                .catch(() => ({
                  total: 0,
                  subscriptions: 0,
                  tips: 0,
                  messages: 0,
                  period: { start: '', end: '' },
                })),
              api
                .getEarnings(String(accountId), { startDate: todayYmd, endDate: todayYmd })
                .catch(() => ({
                  total: 0,
                  subscriptions: 0,
                  tips: 0,
                  messages: 0,
                  period: { start: '', end: '' },
                })),
              api
                .getEarnings(String(accountId), { startDate: weekStartYmd, endDate: todayYmd })
                .catch(() => ({
                  total: 0,
                  subscriptions: 0,
                  tips: 0,
                  messages: 0,
                  period: { start: '', end: '' },
                })),
            ])

          const fansTotal = Math.max(0, Math.floor(Number(profile?.subscribersCount ?? 0)))
          const revTotal = Number(earningsDefault.total) || 0
          const subPart = Number(earningsDefault.subscriptions) || 0
          const tipsPart = Number(earningsDefault.tips) || 0
          const msgPart = Number(earningsDefault.messages) || 0

          result.stats.totalRevenue += revTotal
          result.stats.breakdown.subscriptions += subPart
          result.stats.breakdown.tips += tipsPart
          result.stats.breakdown.messages += msgPart

          result.stats.totalFans += fansTotal
          result.stats.earnings.today += Number(earningsToday.total) || 0
          result.stats.earnings.thisWeek += Number(earningsWeek.total) || 0
          result.stats.earnings.thisMonth += Number(earningsMtd.total) || 0
          result.stats.earnings.total += revTotal

          const username =
            (profile?.username && String(profile.username)) ||
            String(connection.platform_username || '')

          result.platforms['fansly'] = {
            revenue: revTotal,
            fans: fansTotal,
            username,
          }

          await supabase
            .from('platform_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', connection.id)
        } catch (error) {
          console.error('Fansly API error:', error)
          result.platforms['fansly'] = {
            revenue: 0,
            fans: 0,
            username: connection.platform_username || '',
          }
        }
      }
    }

    // Revenue change: this month vs last month from analytics_snapshots, or this month vs long-term average
    const now = new Date()
    const thisMonthPrefix = now.toISOString().slice(0, 7)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthPrefix = lastMonthDate.toISOString().slice(0, 7)
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('date, revenue')
      .eq('user_id', user.id)
      .or(`date.like.${thisMonthPrefix}%,date.like.${lastMonthPrefix}%`)
    let revThisMonth = 0
    let revLastMonth = 0
    for (const s of snapshots || []) {
      if (s.date?.startsWith(thisMonthPrefix)) revThisMonth += Number(s.revenue ?? 0)
      if (s.date?.startsWith(lastMonthPrefix)) revLastMonth += Number(s.revenue ?? 0)
    }
    if (revLastMonth > 0) {
      result.stats.revenueChange = Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100)
    } else if (result.stats.earnings.thisMonth > 0 && result.stats.earnings.total > 0) {
      const avgMonthly = result.stats.earnings.total / 12
      result.stats.revenueChange = Math.round(((result.stats.earnings.thisMonth - avgMonthly) / avgMonthly) * 100)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Revenue fetch error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch revenue' 
    }, { status: 500 })
  }
}
