import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import type { FanClassifyConfig } from '@/lib/divine-manager'
import { FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME } from '@/lib/divine-manager'

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

/**
 * On inbound OnlyFans DM: add fan to active-chat list when Smart classify active_chat is enabled.
 */
export async function activeChatOnInboundOnlyFansMessage(
  supabase: SupabaseClient,
  userId: string,
  platformFanId: string,
): Promise<void> {
  const { data: settings } = await supabase
    .from('divine_manager_settings')
    .select('housekeeping_lists')
    .eq('user_id', userId)
    .maybeSingle()

  const config = (settings?.housekeeping_lists ?? {}) as FanClassifyConfig
  const ac = config.active_chat
  if (!ac?.enabled) return

  const { data: conn } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  const token = conn?.access_token as string | undefined
  if (!token) return

  const api = createOnlyFansAPI()
  api.setAccountId(token)

  const wantName = ac.list_name || FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME
  let listId = ac.list_id?.trim() || ''
  if (!listId) {
    const lists = await api.listUserListsCollectAll()
    const found = lists.find((l) => l.name === wantName)
    listId = found?.id || ''
  }
  if (!listId && config.auto_create_lists) {
    const created = await api.createUserList(wantName)
    let id: unknown
    if (created && typeof created === 'object') {
      const o = created as Record<string, unknown>
      const d = o.data
      id = typeof d === 'object' && d !== null ? (d as Record<string, unknown>).id : o.id
    }
    if (id != null) listId = String(id)
  }
  if (!listId) return

  try {
    await api.addUsersToUserList(listId, [platformFanId])
  } catch (e) {
    console.warn('[active_chat onlyfans]', e)
  }
}

/**
 * On inbound Fansly DM: add CRM tag for active chat when enabled.
 */
export async function activeChatOnInboundFanslyMessage(
  supabase: SupabaseClient,
  userId: string,
  fanRowId: string,
): Promise<void> {
  const { data: settings } = await supabase
    .from('divine_manager_settings')
    .select('housekeeping_lists')
    .eq('user_id', userId)
    .maybeSingle()

  const config = (settings?.housekeeping_lists ?? {}) as FanClassifyConfig
  const ac = config.active_chat
  if (!ac?.enabled) return

  const tagName = ac.tag_name || FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME
  const tagId = await ensureFanslyTag(supabase, userId, tagName)
  if (!tagId) return

  const { data: existing } = await supabase
    .from('fan_tag_assignments')
    .select('id')
    .eq('fan_id', fanRowId)
    .eq('tag_id', tagId)
    .maybeSingle()

  if (existing) return

  try {
    await supabase.from('fan_tag_assignments').insert({ fan_id: fanRowId, tag_id: tagId })
  } catch (e) {
    console.warn('[active_chat fansly]', e)
  }
}
