import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getSettings, getTasks, getDivineVoice, DIVINE_VOICES } from '@/lib/divine-manager'
import type { DivineTodayPlanResponse } from '@/lib/divine/today-plan-types'
import type { DivineManagerTaskRow } from '@/lib/divine-manager'

function taskSummary(t: DivineManagerTaskRow): string {
  const p = t.payload as { summary?: string }
  return typeof p?.summary === 'string' && p.summary.trim() ? p.summary : t.type.replace(/_/g, ' ')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    const [
      settingsRes,
      notifUnread,
      divineNotifUnread,
      leaks,
      contentRows,
      protocolRows,
      protocolOpenCount,
      managerSuggested,
      managerScheduled,
      platformRows,
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
        .select('id, title, status, created_at')
        .eq('user_id', uid)
        .in('status', ['pending', 'executing'])
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('creator_protocol_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .in('status', ['pending', 'executing']),
      getTasks(supabase, uid, { status: 'suggested', limit: 6 }),
      getTasks(supabase, uid, { status: 'scheduled', limit: 6 }),
      supabase.from('platform_connections').select('id').eq('user_id', uid).eq('is_connected', true).limit(1),
    ])

    const notifications_unread = notifUnread.count ?? 0
    const divine_notifications_unread = divineNotifUnread.count ?? 0
    const open_leak_alerts = leaks.count ?? 0

    const suggestedMerged = [...managerSuggested, ...managerScheduled].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const uniqueById = new Map<string, DivineManagerTaskRow>()
    for (const t of suggestedMerged) {
      if (!uniqueById.has(t.id)) uniqueById.set(t.id, t)
    }
    const suggestionItems = Array.from(uniqueById.values())
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        summary: taskSummary(t),
        category: t.category ?? null,
        created_at: t.created_at,
      }))

    const settings = settingsRes
    const voice = settings?.notification_settings?.voice
    const voiceConfigured = settings != null && typeof voice === 'string' && DIVINE_VOICES.includes(getDivineVoice(voice))

    const protocolOpenTotal = protocolOpenCount.count ?? (protocolRows.data ?? []).length

    const body: DivineTodayPlanResponse = {
      inbox: {
        notifications_unread,
        divine_notifications_unread,
      },
      protection: {
        open_leak_alerts,
      },
      calendar: {
        scheduled_upcoming: (contentRows.data ?? []).map((r) => ({
          id: r.id,
          title: (r.title as string | null) ?? null,
          status: (r.status as string | null) ?? null,
          scheduled_at: (r.scheduled_at as string | null) ?? null,
        })),
      },
      protocol: {
        open_count: protocolOpenTotal,
        open_tasks: (protocolRows.data ?? []).map((r) => ({
          id: r.id,
          title: (r.title as string) ?? 'Task',
          status: r.status as string,
          created_at: r.created_at as string,
        })),
      },
      suggestions: {
        items: suggestionItems,
      },
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
