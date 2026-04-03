import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import type { FanClassifyConfig } from '@/lib/divine-manager'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'

function isInboundOnlyFansPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true
  const p = payload as Record<string, unknown>
  if ('isSentByMe' in p) return p.isSentByMe !== true
  return true
}

/**
 * GET — activity snapshot for Smart classify (messages in last minute, fans in active-chat window).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const platformFilter = (searchParams.get('platform') || 'all').toLowerCase()

    if (platformFilter === 'onlyfans' || platformFilter === 'fansly' || platformFilter === 'all') {
      const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
      if (billingBlock) return billingBlock
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('housekeeping_lists')
      .eq('user_id', user.id)
      .maybeSingle()

    const cfg = (settings?.housekeeping_lists ?? {}) as FanClassifyConfig
    const windowMinutes = cfg.active_chat?.window_minutes ?? 30
    const windowCutoffMs = Date.now() - windowMinutes * 60_000
    const oneMinAgoIso = new Date(Date.now() - 60_000).toISOString()

    let messagesLast1MinOnlyFans = 0
    let messagesLast1MinFansly = 0
    const trackedPreview: { platform: string; platform_fan_id: string; username: string | null; last_at: string }[] =
      []

    const latestOfFanMs = new Map<string, number>()
    if (platformFilter === 'all' || platformFilter === 'onlyfans') {
      const { data: cacheRecent } = await supabase
        .from('onlyfans_dm_message_cache')
        .select('platform_fan_id, message_created_at, payload')
        .eq('user_id', user.id)
        .order('message_created_at', { ascending: false })
        .limit(3000)

      for (const row of cacheRecent ?? []) {
        const r = row as { platform_fan_id?: string; message_created_at?: string; payload?: unknown }
        const pid = String(r.platform_fan_id ?? '').trim()
        const at = String(r.message_created_at ?? '').trim()
        if (!pid || !at) continue
        if (!isInboundOnlyFansPayload(r.payload)) continue
        const t = new Date(at).getTime()
        if (!Number.isFinite(t)) continue
        if (t >= Date.now() - 60_000) messagesLast1MinOnlyFans += 1
        if (!latestOfFanMs.has(pid)) latestOfFanMs.set(pid, t)
      }
    }

    const latestFsFanMs = new Map<string, number>()
    if (platformFilter === 'all' || platformFilter === 'fansly') {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, fan_id')
        .eq('user_id', user.id)
        .eq('platform', 'fansly')

      const convToFan = new Map<string, string>()
      const convIds: string[] = []
      for (const c of convs ?? []) {
        const row = c as { id?: string; fan_id?: string }
        if (row.id && row.fan_id) {
          convIds.push(String(row.id))
          convToFan.set(String(row.id), String(row.fan_id))
        }
      }

      if (convIds.length) {
        const { count: fsCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .eq('sender_type', 'fan')
          .gte('sent_at', oneMinAgoIso)
        messagesLast1MinFansly += fsCount ?? 0

        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, sent_at, sender_type')
          .in('conversation_id', convIds)
          .eq('sender_type', 'fan')
          .order('sent_at', { ascending: false })
          .limit(4000)

        for (const raw of msgs ?? []) {
          const m = raw as { conversation_id?: string; sent_at?: string }
          const cid = String(m.conversation_id ?? '')
          const fanRowId = convToFan.get(cid)
          if (!fanRowId) continue
          const t = new Date(String(m.sent_at ?? '')).getTime()
          if (!Number.isFinite(t)) continue
          if (!latestFsFanMs.has(fanRowId)) latestFsFanMs.set(fanRowId, t)
        }
      }
    }

    const trackedOfIds: string[] = []
    for (const [pid, t] of latestOfFanMs) {
      if (t >= windowCutoffMs) trackedOfIds.push(pid)
    }
    const trackedFsRowIds: string[] = []
    for (const [fid, t] of latestFsFanMs) {
      if (t >= windowCutoffMs) trackedFsRowIds.push(fid)
    }

    let activeChatsTracked = 0
    if (platformFilter === 'all' || platformFilter === 'onlyfans') {
      activeChatsTracked += trackedOfIds.length
    }
    if (platformFilter === 'all' || platformFilter === 'fansly') {
      activeChatsTracked += trackedFsRowIds.length
    }

    if ((platformFilter === 'all' || platformFilter === 'onlyfans') && trackedOfIds.length) {
      const { data: fans } = await supabase
        .from('fans')
        .select('platform_fan_id, username, display_name')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .in('platform_fan_id', trackedOfIds.slice(0, 50))

      const byPid = new Map(
        (fans ?? []).map((f) => {
          const row = f as { platform_fan_id?: string }
          return [String(row.platform_fan_id), f] as const
        }),
      )
      for (const pid of trackedOfIds.slice(0, 20)) {
        const f = byPid.get(pid) as { username?: string; display_name?: string } | undefined
        trackedPreview.push({
          platform: 'onlyfans',
          platform_fan_id: pid,
          username: f?.display_name || f?.username || null,
          last_at: new Date(latestOfFanMs.get(pid) ?? 0).toISOString(),
        })
      }
    }

    if ((platformFilter === 'all' || platformFilter === 'fansly') && trackedFsRowIds.length) {
      const { data: fans } = await supabase
        .from('fans')
        .select('id, platform_fan_id, username, display_name')
        .eq('user_id', user.id)
        .eq('platform', 'fansly')
        .in('id', trackedFsRowIds.slice(0, 50))

      const byId = new Map(
        (fans ?? []).map((f) => {
          const row = f as { id?: string }
          return [String(row.id), f] as const
        }),
      )
      for (const fid of trackedFsRowIds.slice(0, 20)) {
        const f = byId.get(fid) as
          | { platform_fan_id?: string; username?: string; display_name?: string }
          | undefined
        trackedPreview.push({
          platform: 'fansly',
          platform_fan_id: String(f?.platform_fan_id ?? fid),
          username: f?.display_name || f?.username || null,
          last_at: new Date(latestFsFanMs.get(fid) ?? 0).toISOString(),
        })
      }
    }

    const messagesLast1Min =
      platformFilter === 'onlyfans'
        ? messagesLast1MinOnlyFans
        : platformFilter === 'fansly'
          ? messagesLast1MinFansly
          : messagesLast1MinOnlyFans + messagesLast1MinFansly

    return NextResponse.json({
      window_minutes: windowMinutes,
      messages_last_1min: messagesLast1Min,
      active_chats_tracked: activeChatsTracked,
      tracked_preview: trackedPreview.slice(0, 20),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
