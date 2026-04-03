import type { SupabaseClient } from '@supabase/supabase-js'

/** Max rows read from local cache (can exceed OnlyFans single-fetch limit). */
export const OF_DM_CACHE_READ_MAX = 500

/**
 * If the newest `synced_at` among loaded cache rows is younger than this, skip a background
 * OnlyFans refresh on GET. Keep this below the chat poll interval (~12s) so polls still
 * revalidate regularly, while avoiding duplicate OF calls on rapid re-opens.
 */
export const OF_DM_BACKGROUND_REFRESH_MIN_INTERVAL_MS = 10_000

export type OnlyFansDmCacheLoadResult = {
  messages: unknown[]
  /** Max `synced_at` among returned rows (ms since epoch); 0 if none parsed. */
  newestSyncedAtMs: number
}

/** Match ordering used by GET /api/onlyfans/messages/[fanId]. */
export function sortOnlyFansMessagesAsc(messages: unknown[]): unknown[] {
  return [...messages].sort((a: any, b: any) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
    if (ta !== tb) return ta - tb
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  })
}

/** Client-visible marker (merged onto payload); not sent to OnlyFans. */
export type CreatixDmCacheMeta = {
  removedFromPlatformAt: string | null
  cachedAt: string | null
}

function normalizeMessageRow(
  userId: string,
  platformFanId: string,
  raw: unknown,
): {
  user_id: string
  platform_fan_id: string
  onlyfans_message_id: string
  message_created_at: string
  payload: unknown
  removed_from_platform_at: null
  synced_at: string
} | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  const id = m.id != null ? String(m.id) : ''
  if (!id) return null
  const created =
    typeof m.createdAt === 'string' && m.createdAt
      ? m.createdAt
      : new Date().toISOString()
  return {
    user_id: userId,
    platform_fan_id: platformFanId,
    onlyfans_message_id: id,
    message_created_at: created,
    payload: raw,
    removed_from_platform_at: null,
    synced_at: new Date().toISOString(),
  }
}

function apiTailMeta(messages: unknown[]): { ids: string[]; oldestIso: string } | null {
  const sorted = sortOnlyFansMessagesAsc(messages) as { id?: unknown; createdAt?: unknown }[]
  if (sorted.length === 0) return null
  const ids = sorted.map((m) => String(m?.id ?? '')).filter(Boolean)
  const oldest = sorted[0]?.createdAt
  if (typeof oldest !== 'string' || !oldest.trim()) return null
  return { ids, oldestIso: oldest }
}

/** Upsert rows from a live OnlyFans fetch; clears removal flag if the message is back. */
export async function upsertOnlyFansDmMessageCache(
  supabase: SupabaseClient,
  userId: string,
  platformFanId: string,
  rawMessages: unknown[],
): Promise<void> {
  const fanKey = String(platformFanId)
  const rows = rawMessages
    .map((r) => normalizeMessageRow(userId, fanKey, r))
    .filter((x): x is NonNullable<typeof x> => x != null)
  if (rows.length === 0) return
  const { error } = await supabase.from('onlyfans_dm_message_cache').upsert(rows, {
    onConflict: 'user_id,platform_fan_id,onlyfans_message_id',
  })
  if (error) {
    console.warn('[of-dm-cache] upsert failed:', error.message)
  }
}

/**
 * After a full tail response from OnlyFans: upsert, then soft-mark cache rows in the same
 * time window that are missing from the response (deleted on platform).
 */
export async function syncOnlyFansDmTailAndMarkRemoved(
  supabase: SupabaseClient,
  userId: string,
  platformFanId: string,
  rawApiMessages: unknown[],
): Promise<void> {
  await upsertOnlyFansDmMessageCache(supabase, userId, platformFanId, rawApiMessages)
  const meta = apiTailMeta(rawApiMessages)
  if (!meta || meta.ids.length === 0) return

  const { error } = await supabase.rpc('mark_onlyfans_dm_removed_if_missing_from_tail', {
    p_user_id: userId,
    p_platform_fan_id: String(platformFanId),
    p_api_message_ids: meta.ids,
    p_oldest_visible_on_platform: meta.oldestIso,
  })
  if (error) {
    console.warn('[of-dm-cache] mark_removed RPC failed (migration 055 may be missing):', error.message)
  }
}

function mergePayloadWithMeta(
  payload: unknown,
  removedAt: string | null,
  syncedAt: string | null,
): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const base = { ...(payload as Record<string, unknown>) }
  delete base._creatix
  const meta: CreatixDmCacheMeta = {
    removedFromPlatformAt: removedAt,
    cachedAt: syncedAt,
  }
  return { ...base, _creatix: meta }
}

/** Remove all cached DM rows for a creator (e.g. when OnlyFans is disconnected). */
export async function clearOnlyFansDmMessageCacheForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('onlyfans_dm_message_cache')
    .delete()
    .eq('user_id', userId)
  if (error) {
    console.warn('[of-dm-cache] clear user cache failed:', error.message)
  }
}

export async function deleteOnlyFansDmCacheMessage(
  supabase: SupabaseClient,
  userId: string,
  platformFanId: string,
  onlyfansMessageId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('onlyfans_dm_message_cache')
    .delete()
    .eq('user_id', userId)
    .eq('platform_fan_id', String(platformFanId))
    .eq('onlyfans_message_id', String(onlyfansMessageId))
    .select('id')

  if (error) {
    return { ok: false, error: error.message }
  }
  if (!data?.length) {
    return { ok: false, error: 'not_found' }
  }
  return { ok: true }
}

export async function loadOnlyFansDmMessageCache(
  supabase: SupabaseClient,
  userId: string,
  platformFanId: string,
  limit: number,
): Promise<OnlyFansDmCacheLoadResult> {
  const fanKey = String(platformFanId)
  const lim = Math.min(Math.max(1, limit), OF_DM_CACHE_READ_MAX)
  const { data, error } = await supabase
    .from('onlyfans_dm_message_cache')
    .select('payload, removed_from_platform_at, synced_at')
    .eq('user_id', userId)
    .eq('platform_fan_id', fanKey)
    .order('message_created_at', { ascending: false })
    .limit(lim)

  if (error) {
    console.warn('[of-dm-cache] load failed:', error.message)
    return { messages: [], newestSyncedAtMs: 0 }
  }
  const rows = data ?? []
  let newestSyncedAtMs = 0
  for (const r of rows as { synced_at?: string | null }[]) {
    if (typeof r.synced_at === 'string' && r.synced_at) {
      const t = Date.parse(r.synced_at)
      if (!Number.isNaN(t)) newestSyncedAtMs = Math.max(newestSyncedAtMs, t)
    }
  }
  const payloads = rows
    .map((r: { payload: unknown; removed_from_platform_at?: string | null; synced_at?: string | null }) =>
      mergePayloadWithMeta(r.payload, r.removed_from_platform_at ?? null, r.synced_at ?? null),
    )
    .reverse()
  return { messages: payloads, newestSyncedAtMs }
}
