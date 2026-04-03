import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getSettings, getDivineVoice, DIVINE_VOICES } from '@/lib/divine-manager'
import type { DivineTodayPlanResponse } from '@/lib/divine/today-plan-types'
import { runProtocolPlanRollover, utcPlanDateString } from '@/lib/divine/protocol-plan-rollover'
import { sortProtocolTasksForPlan } from '@/lib/divine/sort-protocol-tasks'
import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'
import { isLeftoverTask } from '@/lib/creator-protocol-task-types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    await runProtocolPlanRollover(supabase, uid)
    const today = utcPlanDateString()

    const [
      settingsRes,
      notifUnread,
      divineNotifUnread,
      leaks,
      contentRows,
      protocolForDay,
      platformRows,
      churnSettingsRow,
      churnHighCount,
    ] = await Promise.all([
      getSettings(supabase, uid),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('read', false)
        .eq('origin', 'divine_app'),
      supabase.from('leak_alerts').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'detected'),
      supabase
        .from('content')
        .select('id, title, status, scheduled_at')
        .eq('user_id', uid)
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(8),
      supabase
        .from('creator_protocol_tasks')
        .select(
          'id, title, body, status, metadata, plan_date, priority_tier, sort_order, created_at',
        )
        .eq('user_id', uid)
        .eq('plan_date', today)
        .limit(80),
      supabase.from('platform_connections').select('id').eq('user_id', uid).eq('is_connected', true).limit(1),
      supabase.from('circe_churn_settings').select('enabled, last_run_at').eq('user_id', uid).maybeSingle(),
      supabase
        .from('fan_churn_snapshots')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .in('risk_level', ['high', 'critical']),
    ])

    const notifications_unread = notifUnread.count ?? 0
    const divine_notifications_unread = divineNotifUnread.count ?? 0
    const open_leak_alerts = leaks.count ?? 0

    const settings = settingsRes
    const voice = settings?.notification_settings?.voice
    const voiceConfigured = settings != null && typeof voice === 'string' && DIVINE_VOICES.includes(getDivineVoice(voice))

    const protocolRows = (protocolForDay.data ?? []) as Pick<
      CreatorProtocolTaskRow,
      | 'id'
      | 'title'
      | 'body'
      | 'status'
      | 'metadata'
      | 'plan_date'
      | 'priority_tier'
      | 'sort_order'
      | 'created_at'
    >[]

    const sorted = sortProtocolTasksForPlan(protocolRows)

    const plan_tasks = sorted.map((r) => {
      const meta =
        r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {}
      return {
        id: r.id,
        title: (r.title as string) ?? 'Task',
        body: (r.body as string | null) ?? null,
        status: r.status as string,
        plan_date: String(r.plan_date ?? today),
        priority_tier: typeof r.priority_tier === 'number' ? r.priority_tier : 4,
        sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
        leftover: isLeftoverTask(meta),
        metadata: meta,
        created_at: r.created_at as string,
      }
    })

    const protocolOpenTotal = plan_tasks.filter((t) => t.status === 'pending' || t.status === 'executing').length

    const churnS = churnSettingsRow.data as { enabled?: boolean; last_run_at?: string | null } | null
    const churnHigh = churnHighCount.count ?? 0

    const body: DivineTodayPlanResponse = {
      inbox: {
        notifications_unread,
        divine_notifications_unread,
      },
      protection: {
        open_leak_alerts,
      },
      retention: {
        churn_background_enabled: churnS?.enabled === true,
        last_churn_run_at: typeof churnS?.last_run_at === 'string' ? churnS.last_run_at : null,
        high_risk_churn_snapshots: churnHigh,
        hub_path: '/dashboard/retention/churn',
      },
      calendar: {
        scheduled_upcoming: (contentRows.data ?? []).map((r) => ({
          id: r.id,
          title: (r.title as string | null) ?? null,
          status: (r.status as string | null) ?? null,
          scheduled_at: (r.scheduled_at as string | null) ?? null,
        })),
      },
      plan_tasks,
      setup: {
        has_platform_connection: (platformRows.data?.length ?? 0) > 0,
        manager_mode_on: settings != null && settings.mode !== 'off',
        voice_configured: voiceConfigured,
        beta_acknowledged: settings?.beta_acknowledged === true,
        protocol_task_count: protocolOpenTotal,
      },
    }

    return NextResponse.json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load today plan'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
