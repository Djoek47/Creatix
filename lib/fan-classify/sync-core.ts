import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import type { FanClassifyConfig, FanClassifySegmentRule } from '@/lib/divine-manager'
import {
  defaultFanClassifyListName,
  FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
} from '@/lib/divine-manager'
import type { ClassifyFanRow } from '@/lib/fan-classify/evaluate'
import { fanMatchesClassifySegment } from '@/lib/fan-classify/evaluate'

type LegacySegmentKey = 'whale_spend' | 'active_chatter' | 'cold'

function unwrapListPayload(raw: unknown): { id: string; name?: string }[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const arr = o.data ?? o.lists ?? o.items ?? raw
  if (!Array.isArray(arr)) return []
  const out: { id: string; name?: string }[] = []
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = r.id ?? r.userListId
    if (id == null) continue
    const item: { id: string; name?: string } = { id: String(id) }
    if (r.name != null) item.name = String(r.name)
    out.push(item)
  }
  return out
}

function unwrapUserIds(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const arr = o.data ?? o.users ?? o.items ?? raw
  if (!Array.isArray(arr)) return []
  const out: string[] = []
  for (const row of arr) {
    if (row == null) continue
    if (typeof row === 'string' || typeof row === 'number') {
      out.push(String(row))
      continue
    }
    if (typeof row === 'object') {
      const r = row as Record<string, unknown>
      const id = r.id ?? r.userId ?? r.user_id
      if (id != null) out.push(String(id))
    }
  }
  return out
}

function rowToClassifyFan(r: Record<string, unknown>): ClassifyFanRow | null {
  const id = r.id != null ? String(r.id) : ''
  const platform = r.platform != null ? String(r.platform) : ''
  const platform_fan_id = r.platform_fan_id != null ? String(r.platform_fan_id) : null
  if (!id || !platform || !platform_fan_id) return null
  return {
    id,
    platform,
    platform_fan_id,
    total_spent: r.total_spent != null ? Number(r.total_spent) : null,
    subscription_price: r.subscription_price != null ? Number(r.subscription_price) : null,
    subscription_status: r.subscription_status != null ? String(r.subscription_status) : null,
    subscription_account_type: r.subscription_account_type != null ? String(r.subscription_account_type) : null,
    first_subscribed_at: r.first_subscribed_at != null ? String(r.first_subscribed_at) : null,
    subscription_start: r.subscription_start != null ? String(r.subscription_start) : null,
    created_at: r.created_at != null ? String(r.created_at) : null,
    last_interaction_at: r.last_interaction_at != null ? String(r.last_interaction_at) : null,
    spend_tips: r.spend_tips != null ? Number(r.spend_tips) : null,
    spend_messages: r.spend_messages != null ? Number(r.spend_messages) : null,
    spend_posts: r.spend_posts != null ? Number(r.spend_posts) : null,
    spend_subscriptions: r.spend_subscriptions != null ? Number(r.spend_subscriptions) : null,
  }
}

async function fetchAllListUserIds(
  api: ReturnType<typeof createOnlyFansAPI>,
  listId: string,
): Promise<Set<string>> {
  const ids = new Set<string>()
  let offset = 0
  const page = 100
  for (;;) {
    const res = await api.listUserListUsers(listId, { limit: page, offset })
    const chunk = unwrapUserIds(res)
    if (chunk.length === 0) break
    chunk.forEach((id) => ids.add(id))
    if (chunk.length < page) break
    offset += page
  }
  return ids
}

async function ensureFanslyTag(supabase: SupabaseClient, userId: string, name: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('fan_tags')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .maybeSingle()
  if (existing && (existing as { id?: string }).id) return String((existing as { id: string }).id)

  const { data: created, error } = await supabase
    .from('fan_tags')
    .insert({ user_id: userId, name, color: '#7c3aed' })
    .select('id')
    .single()
  if (error || !created) return null
  return String((created as { id: string }).id)
}

async function syncFanslyTagAssignments(
  supabase: SupabaseClient,
  userId: string,
  tagId: string,
  desiredFanRowIds: Set<string>,
  details: string[],
  label: string,
): Promise<void> {
  const { data: existing } = await supabase.from('fan_tag_assignments').select('id, fan_id').eq('tag_id', tagId)

  const current = new Set<string>()
  const assignmentIdByFan = new Map<string, string>()
  for (const row of existing ?? []) {
    const r = row as { id?: string; fan_id?: string }
    if (r.fan_id) {
      current.add(String(r.fan_id))
      if (r.id) assignmentIdByFan.set(String(r.fan_id), String(r.id))
    }
  }

  const toAdd = [...desiredFanRowIds].filter((id) => !current.has(id))
  const toRemove = [...current].filter((id) => !desiredFanRowIds.has(id))

  if (toRemove.length) {
    const ids = toRemove.map((fid) => assignmentIdByFan.get(fid)).filter(Boolean) as string[]
    if (ids.length) {
      await supabase.from('fan_tag_assignments').delete().in('id', ids)
    }
  }

  for (const fanId of toAdd) {
    await supabase.from('fan_tag_assignments').insert({ fan_id: fanId, tag_id: tagId })
  }

  details.push(`${label} (fansly tags): +${toAdd.length} −${toRemove.length} (target ${desiredFanRowIds.size})`)
}

async function syncLegacyOnlyFansSegment(
  api: ReturnType<typeof createOnlyFansAPI>,
  rule: FanClassifySegmentRule,
  listId: string,
  details: string[],
): Promise<void> {
  const desired = new Set<string>()
  const seg = rule.segment as LegacySegmentKey

  if (seg === 'whale_spend') {
    const min = rule.spendMin ?? 500
    const top = await api.getFansTop({ limit: 200, offset: 0, sort: 'total' })
    const raw = top.data || []
    for (const row of raw) {
      const r = row as unknown as Record<string, unknown>
      const sp = Number(r.totalSpent ?? 0)
      const id = r.id != null ? String(r.id) : ''
      if (id && sp >= min) desired.add(id)
    }
  } else if (seg === 'active_chatter') {
    const days = rule.chatDays ?? 7
    const cutoff = Date.now() - days * 86400000
    let offset = 0
    const page = 50
    for (let pageIdx = 0; pageIdx < 25; pageIdx++) {
      const conv = await api.getConversations({ limit: page, offset, order: 'recent' })
      const chats = conv.conversations || []
      if (chats.length === 0) break
      for (const c of chats) {
        const lm = c.lastMessage?.createdAt
        if (!lm) continue
        if (new Date(lm).getTime() >= cutoff) {
          const uid = c.user?.id
          if (uid) desired.add(String(uid))
        }
      }
      offset += page
      if (chats.length < page) break
    }
  } else if (seg === 'cold') {
    const coldMax = rule.coldSpendMax ?? 50
    const activeDays = rule.chatDays ?? 14
    const activeCutoff = Date.now() - activeDays * 86400000
    const activeIds = new Set<string>()
    let offset = 0
    const page = 50
    for (let pageIdx = 0; pageIdx < 25; pageIdx++) {
      const conv = await api.getConversations({ limit: page, offset, order: 'recent' })
      const chats = conv.conversations || []
      if (chats.length === 0) break
      for (const c of chats) {
        const lm = c.lastMessage?.createdAt
        if (lm && new Date(lm).getTime() >= activeCutoff) {
          const uid = c.user?.id
          if (uid) activeIds.add(String(uid))
        }
      }
      offset += page
      if (chats.length < page) break
    }
    let off2 = 0
    for (let pageIdx = 0; pageIdx < 40; pageIdx++) {
      const pack = await api.getFansActive({ limit: page, offset: off2 })
      const raw = pack.data || []
      if (raw.length === 0) break
      for (const row of raw) {
        const r = row as unknown as Record<string, unknown>
        const id = r.id != null ? String(r.id) : ''
        const sp = Number(r.totalSpent ?? 0)
        if (id && !activeIds.has(id) && sp <= coldMax) desired.add(id)
      }
      off2 += page
      if (raw.length < page) break
    }
  }

  const current = await fetchAllListUserIds(api, listId)
  const toAdd = [...desired].filter((id) => !current.has(id))
  const toRemove = [...current].filter((id) => !desired.has(id))
  const batch = 40
  for (let i = 0; i < toAdd.length; i += batch) {
    await api.addUsersToUserList(listId, toAdd.slice(i, i + batch))
  }
  for (let i = 0; i < toRemove.length; i += batch) {
    const slice = toRemove.slice(i, i + batch)
    await Promise.all(slice.map((uid) => api.removeUserFromUserList(listId, uid)))
  }
  details.push(`${rule.segment} (onlyfans api): +${toAdd.length} −${toRemove.length} (target ${desired.size})`)
}

export async function syncFanClassifyForUser(
  supabase: SupabaseClient,
  userId: string,
  config: FanClassifyConfig,
  opts: { onlyfansAccessToken: string | null },
): Promise<{ ok: boolean; error?: string; details: string[] }> {
  const details: string[] = []
  if (!config.enabled || !config.segments?.length) {
    details.push('skipped: classify disabled or no segments')
    return { ok: true, details }
  }

  const nowMs = Date.now()
  const { data: fanRows, error: fanErr } = await supabase
    .from('fans')
    .select(
      'id, platform, platform_fan_id, total_spent, subscription_price, subscription_status, subscription_account_type, first_subscribed_at, subscription_start, created_at, last_interaction_at, spend_tips, spend_messages, spend_posts, spend_subscriptions',
    )
    .eq('user_id', userId)

  if (fanErr) {
    return { ok: false, error: fanErr.message, details }
  }

  const classifyRows: ClassifyFanRow[] = []
  for (const raw of fanRows ?? []) {
    const r = rowToClassifyFan(raw as Record<string, unknown>)
    if (r) classifyRows.push(r)
  }

  const ofToken = opts.onlyfansAccessToken
  let api: ReturnType<typeof createOnlyFansAPI> | null = null
  let existingLists: { id: string; name?: string }[] = []

  if (ofToken) {
    api = createOnlyFansAPI()
    api.setAccountId(ofToken)
    const listsPayload = await api.listUserLists({ limit: 100, offset: 0 })
    existingLists = unwrapListPayload(listsPayload)
  }

  const autoCreate = config.auto_create_lists === true

  async function resolveOnlyFansListId(rule: FanClassifySegmentRule): Promise<string | null> {
    if (!api) return null
    if (rule.listId) return rule.listId
    const wantName = rule.listName || defaultFanClassifyListName(rule.segment)
    const found = existingLists.find((l) => l.name === wantName)
    if (found?.id) return found.id
    if (!autoCreate) return null
    const created = await api.createUserList(wantName)
    let id: unknown
    if (created && typeof created === 'object') {
      const o = created as Record<string, unknown>
      const d = o.data
      id = typeof d === 'object' && d !== null ? (d as Record<string, unknown>).id : o.id
    }
    if (id != null) {
      const sid = String(id)
      existingLists = [...existingLists, { id: sid, name: wantName }]
      details.push(`created OF list "${wantName}" (${sid})`)
      return sid
    }
    return null
  }

  for (const rule of config.segments) {
    if (rule.enabled === false) {
      details.push(`skip ${rule.segment}: disabled`)
      continue
    }

    const legacyOf =
      rule.segment === 'whale_spend' || rule.segment === 'active_chatter' || rule.segment === 'cold'

    const fsDesired = new Set<string>()
    const ofDesiredCrm = new Set<string>()
    for (const row of classifyRows) {
      if (!fanMatchesClassifySegment(row, rule, nowMs)) continue
      if (row.platform === 'onlyfans' && row.platform_fan_id) ofDesiredCrm.add(row.platform_fan_id)
      if (row.platform === 'fansly') fsDesired.add(row.id)
    }

    if (ofToken && api) {
      const listId = await resolveOnlyFansListId(rule)
      if (!listId) {
        details.push(`skip ${rule.segment} (onlyfans): no list`)
      } else if (legacyOf) {
        await syncLegacyOnlyFansSegment(api, rule, listId, details)
      } else {
        const current = await fetchAllListUserIds(api, listId)
        const toAdd = [...ofDesiredCrm].filter((id) => !current.has(id))
        const toRemove = [...current].filter((id) => !ofDesiredCrm.has(id))
        const batch = 40
        for (let i = 0; i < toAdd.length; i += batch) {
          await api.addUsersToUserList(listId, toAdd.slice(i, i + batch))
        }
        for (let i = 0; i < toRemove.length; i += batch) {
          const slice = toRemove.slice(i, i + batch)
          await Promise.all(slice.map((uid) => api.removeUserFromUserList(listId, uid)))
        }
        details.push(`${rule.segment} (onlyfans crm): +${toAdd.length} −${toRemove.length} (target ${ofDesiredCrm.size})`)
      }
    }

    const tagName = rule.tagName || defaultFanClassifyListName(rule.segment)
    const tagId = await ensureFanslyTag(supabase, userId, tagName)
    if (!tagId) {
      details.push(`skip ${rule.segment} (fansly): could not create tag`)
    } else {
      await syncFanslyTagAssignments(supabase, userId, tagId, fsDesired, details, rule.segment)
    }
  }

  await reconcileActiveChat(supabase, userId, config, api, details)

  await supabase
    .from('divine_manager_settings')
    .update({
      housekeeping_lists: {
        ...config,
        last_sync_at: new Date().toISOString(),
      } as object,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return { ok: true, details }
}

async function latestOnlyFansInboundMap(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const { data: rows } = await supabase
    .from('messages')
    .select('from_fan_id, received_at')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .order('received_at', { ascending: false })
    .limit(2500)

  const m = new Map<string, number>()
  for (const r of rows ?? []) {
    const row = r as { from_fan_id?: string; received_at?: string }
    const id = String(row.from_fan_id ?? '').trim()
    const at = String(row.received_at ?? '').trim()
    if (!id || !at || m.has(id)) continue
    const t = new Date(at).getTime()
    if (Number.isFinite(t)) m.set(id, t)
  }
  return m
}

async function latestFanslyInboundByFanRowId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, fan_id')
    .eq('user_id', userId)
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
  if (!convIds.length) return new Map()

  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, sent_at, sender_type')
    .in('conversation_id', convIds)
    .eq('sender_type', 'fan')
    .order('sent_at', { ascending: false })
    .limit(4000)

  const byFan = new Map<string, number>()
  for (const raw of msgs ?? []) {
    const m = raw as { conversation_id?: string; sent_at?: string }
    const cid = String(m.conversation_id ?? '')
    const fanRowId = convToFan.get(cid)
    if (!fanRowId || byFan.has(fanRowId)) continue
    const t = new Date(String(m.sent_at ?? '')).getTime()
    if (!Number.isFinite(t)) continue
    byFan.set(fanRowId, t)
  }
  return byFan
}

async function reconcileActiveChat(
  supabase: SupabaseClient,
  userId: string,
  config: FanClassifyConfig,
  api: ReturnType<typeof createOnlyFansAPI> | null,
  details: string[],
): Promise<void> {
  const ac = config.active_chat
  if (!ac?.enabled) return

  const windowMs = (ac.window_minutes ?? 30) * 60_000
  const cutoff = Date.now() - windowMs

  if (api && (ac.list_id || ac.list_name || config.auto_create_lists)) {
    const wantName = ac.list_name || FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME
    const listId =
      ac.list_id ||
      (await (async () => {
        const listsPayload = await api.listUserLists({ limit: 100, offset: 0 })
        const lists = unwrapListPayload(listsPayload)
        const found = lists.find((l) => l.name === wantName)
        if (found?.id) return found.id
        if (!config.auto_create_lists) return null
        const created = await api.createUserList(wantName)
        let id: unknown
        if (created && typeof created === 'object') {
          const o = created as Record<string, unknown>
          const d = o.data
          id = typeof d === 'object' && d !== null ? (d as Record<string, unknown>).id : o.id
        }
        return id != null ? String(id) : null
      })())

    if (listId) {
      const latest = await latestOnlyFansInboundMap(supabase, userId)
      const desired = new Set<string>()
      for (const [pid, t] of latest) {
        if (t >= cutoff) desired.add(pid)
      }
      const current = await fetchAllListUserIds(api, listId)
      const toAdd = [...desired].filter((id) => !current.has(id))
      const toRemove = [...current].filter((id) => !desired.has(id))
      const batch = 40
      for (let i = 0; i < toAdd.length; i += batch) {
        await api.addUsersToUserList(listId, toAdd.slice(i, i + batch))
      }
      for (let i = 0; i < toRemove.length; i += batch) {
        const slice = toRemove.slice(i, i + batch)
        await Promise.all(slice.map((uid) => api.removeUserFromUserList(listId, uid)))
      }
      details.push(`active_chat (onlyfans): +${toAdd.length} −${toRemove.length} (target ${desired.size})`)
    }
  }

  const tagName = ac.tag_name || FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME
  const tagId = await ensureFanslyTag(supabase, userId, tagName)
  if (tagId) {
    const latestFs = await latestFanslyInboundByFanRowId(supabase, userId)
    const desiredFs = new Set<string>()
    for (const [fanRowId, t] of latestFs) {
      if (t >= cutoff) desiredFs.add(fanRowId)
    }
    await syncFanslyTagAssignments(supabase, userId, tagId, desiredFs, details, 'active_chat')
  }
}
