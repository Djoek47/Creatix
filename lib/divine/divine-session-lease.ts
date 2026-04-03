import type { SupabaseClient } from '@supabase/supabase-js'

const LEASE_TTL_MS = 5 * 60 * 1000

export function isDivineSessionLeaseEnforced(): boolean {
  return process.env.DIVINE_ENFORCE_SESSION_LEASE === 'true'
}

/**
 * Optional stub: when `DIVINE_ENFORCE_SESSION_LEASE=true`, only one active
 * `session_id` per user at a time (see `scripts/038_divine_session_leases.sql`).
 * Requires `divine_session_leases` table; fails open if the query errors.
 */
export async function claimDivineSessionLease(
  supabase: SupabaseClient,
  userId: string,
  clientSessionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isDivineSessionLeaseEnforced()) return { ok: true }

  const sid = String(clientSessionId || '').trim()
  if (!sid || sid.length > 128) {
    return { ok: false, message: 'Invalid divine_session_id.' }
  }

  const maxConcurrent = Math.max(1, Math.min(10, Number(process.env.DIVINE_MAX_CONCURRENT_SESSIONS ?? '1')))
  if (maxConcurrent > 1) {
    return { ok: true }
  }

  const expiresAt = new Date(Date.now() + LEASE_TTL_MS).toISOString()

  const { data: row, error: selErr } = await supabase
    .from('divine_session_leases')
    .select('session_id, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (selErr) {
    console.warn('[divine-session-lease]', selErr.message)
    return { ok: true }
  }

  const now = Date.now()
  const existing =
    row && typeof row.session_id === 'string' && typeof row.expires_at === 'string'
      ? { sessionId: row.session_id, expiresAt: new Date(row.expires_at).getTime() }
      : null

  if (existing && existing.expiresAt > now && existing.sessionId !== sid) {
    return {
      ok: false,
      message:
        'Another Divine Manager session is active on this account. Close the other session or upgrade for additional concurrent agents.',
    }
  }

  const { error: upErr } = await supabase.from('divine_session_leases').upsert(
    {
      user_id: userId,
      session_id: sid,
      expires_at: expiresAt,
    },
    { onConflict: 'user_id' },
  )

  if (upErr) {
    console.warn('[divine-session-lease]', upErr.message)
    return { ok: true }
  }

  return { ok: true }
}
