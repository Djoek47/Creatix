/**
 * Lightweight episodic memory for Divine Manager (chat + voice context injection).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type DivineEpisodicSource = 'chat' | 'voice' | 'system'

export type AppendMemoryOpts = {
  source: DivineEpisodicSource
  summary: string
  metadata?: Record<string, unknown>
}

const MAX_SUMMARY_CHARS = 900
const CONTEXT_ROW_LIMIT = 12
/** After insert, keep at most this many rows per user. */
export const DIVINE_EPISODIC_ROW_CAP = 50

/** Bulleted block suitable for prompt injection (empty string if none). */
export async function getMemoryContext(
  supabase: SupabaseClient,
  userId: string,
  opts?: { limit?: number },
): Promise<string> {
  const limit = Math.min(20, Math.max(1, opts?.limit ?? CONTEXT_ROW_LIMIT))
  const { data, error } = await supabase
    .from('divine_episodic_memories')
    .select('summary,created_at,source')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data?.length) return ''

  const lines = [...data].reverse().map((row: { summary: string }, i) => {
    const text = typeof row.summary === 'string' ? row.summary.trim() : ''
    if (!text) return null
    const clipped = text.length > 220 ? `${text.slice(0, 217)}…` : text
    return `- ${clipped}`
  })
  const bullets = lines.filter((x): x is string => x != null && x.length > 2)
  if (!bullets.length) return ''
  return `Recent session notes (may be incomplete — verify with tools if needed):\n${bullets.join('\n')}\n`
}

export async function appendMemory(
  supabase: SupabaseClient,
  userId: string,
  opts: AppendMemoryOpts,
): Promise<{ ok: boolean; error?: string }> {
  const summary =
    opts.summary.trim().length > MAX_SUMMARY_CHARS
      ? `${opts.summary.trim().slice(0, MAX_SUMMARY_CHARS - 1)}…`
      : opts.summary.trim()
  if (!summary) return { ok: false, error: 'empty_summary' }

  const meta = opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : {}

  const { error: insErr } = await supabase.from('divine_episodic_memories').insert({
    user_id: userId,
    source: opts.source,
    summary,
    metadata: meta,
  })
  if (insErr) {
    return { ok: false, error: insErr.message }
  }

  const { count, error: countErr } = await supabase
    .from('divine_episodic_memories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countErr || count == null) return { ok: true }

  const over = Number(count) - DIVINE_EPISODIC_ROW_CAP
  if (over <= 0) return { ok: true }

  const { data: oldest, error: listErr } = await supabase
    .from('divine_episodic_memories')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(over)

  if (listErr || !oldest?.length) return { ok: true }

  const ids = oldest.map((r: { id: string }) => r.id).filter(Boolean)
  await supabase.from('divine_episodic_memories').delete().in('id', ids)

  return { ok: true }
}
