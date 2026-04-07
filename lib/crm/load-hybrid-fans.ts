import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createFanslyAPI } from '@/lib/fansly-api'
import { normalizeFanFromRow } from '@/lib/fans/normalize-fan-row'
import { extractOnlyFansFanRows } from '@/lib/onlyfans/fan-list-extract'
import { adultPlatformBillingGateWhenEitherConnected } from '@/lib/onlyfans-api-route'
import { fanDedupeKey, fanslyLiveToFan, onlyFansLiveRowToFan } from '@/lib/crm/fan-from-live'
import type { CrmFanListItem } from '@/lib/crm/crm-fan-types'
import type { Fan } from '@/lib/types'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'

function enrichDbFan(row: Record<string, unknown>, fan: Fan): CrmFanListItem {
  return {
    ...fan,
    creator_classification: (row.creator_classification as string | null | undefined) ?? null,
    subscription_tier_raw: (row.subscription_tier as string | null | undefined) ?? null,
    subscription_status_raw: (row.subscription_status as string | null | undefined) ?? null,
    _source: 'database',
  }
}

export type LoadHybridFansOptions = {
  mode: 'hybrid' | 'database'
  limitOf: number
  limitFansly: number
  /**
   * `strict` — return billing block response (CRM GET behavior).
   * `fallback_db` — skip live fetches when billing would block; continue with DB rows only.
   */
  billingPolicy: 'strict' | 'fallback_db'
}

export type LoadHybridFansResult =
  | { ok: true; fans: CrmFanListItem[]; meta: CrmFansResponse['meta'] }
  | { ok: false; response: NextResponse }

/**
 * Shared merge of DB `fans` + live OnlyFans/Fansly lists (same rules as GET /api/crm/fans).
 */
export async function loadHybridCrmFans(
  supabase: SupabaseClient,
  userId: string,
  options: LoadHybridFansOptions,
): Promise<LoadHybridFansResult> {
  const { mode, limitOf, limitFansly, billingPolicy } = options

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, access_token, platform_user_id')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .in('platform', ['onlyfans', 'fansly'])

  const ofConn = connections?.find((c) => c.platform === 'onlyfans')
  const fanslyConn = connections?.find((c) => c.platform === 'fansly')
  const ofToken = ofConn?.access_token ?? null
  const fanslyAccountId = fanslyConn?.access_token ?? fanslyConn?.platform_user_id ?? null

  const { data: dbRows, error: dbErr } = await supabase
    .from('fans')
    .select('*')
    .eq('user_id', userId)
    .order('total_spent', { ascending: false })
    .limit(8000)

  if (dbErr) {
    return {
      ok: false,
      response: NextResponse.json({ error: dbErr.message }, { status: 500 }),
    }
  }

  const merged = new Map<string, CrmFanListItem>()
  for (const row of dbRows || []) {
    const rec = row as Record<string, unknown>
    const fan = normalizeFanFromRow(rec)
    merged.set(fanDedupeKey(fan), enrichDbFan(rec, fan))
  }

  const warnings: string[] = []
  let liveOfAdded = 0
  let liveFanslyAdded = 0

  if (mode === 'hybrid') {
    let allowLive = true
    if (ofToken || fanslyAccountId) {
      const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
      if (billingBlock) {
        if (billingPolicy === 'strict') {
          return { ok: false, response: billingBlock }
        }
        warnings.push('Live subscriber lists skipped (billing or access). Using saved CRM rows only.')
        allowLive = false
      }
    }

    if (allowLive && ofToken) {
      try {
        const api = createOnlyFansAPI()
        api.setAccountId(ofToken)
        const raw = await api.getFansActive({ limit: limitOf, offset: 0 })
        const rows = extractOnlyFansFanRows(raw) as Record<string, unknown>[]
        for (const row of rows) {
          const fan = onlyFansLiveRowToFan(row, userId)
          const k = fanDedupeKey(fan)
          if (!merged.has(k)) {
            merged.set(k, { ...fan, _source: 'live_onlyfans' })
            liveOfAdded++
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('ONLYFANS_SESSION_EXPIRED')) {
          warnings.push('OnlyFans session expired — reconnect in Integrations. Showing CRM data only.')
        } else {
          warnings.push(`OnlyFans live list: ${msg}`)
        }
      }
    }

    if (allowLive && fanslyAccountId) {
      try {
        const api = createFanslyAPI(String(fanslyAccountId))
        const res = await api.getFans(String(fanslyAccountId), { status: 'active', limit: limitFansly, offset: 0 })
        for (const f of res.data || []) {
          const fan = fanslyLiveToFan(
            {
              id: f.id,
              username: f.username,
              displayName: f.displayName,
              avatar: f.avatar,
              subscribedAt: f.subscribedAt,
              expiresAt: f.expiresAt,
              totalSpent: f.totalSpent,
              subscriptionTier: f.subscriptionTier,
            },
            userId,
          )
          const k = fanDedupeKey(fan)
          if (!merged.has(k)) {
            merged.set(k, { ...fan, _source: 'live_fansly' })
            liveFanslyAdded++
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        warnings.push(`Fansly live list: ${msg}`)
      }
    }
  }

  const fans = Array.from(merged.values()).sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))

  return {
    ok: true,
    fans,
    meta: {
      mode,
      databaseCount: (dbRows || []).length,
      mergedTotal: fans.length,
      liveOnlyFansAdded: liveOfAdded,
      liveFanslyAdded: liveFanslyAdded,
      onlyFansConnected: Boolean(ofToken),
      fanslyConnected: Boolean(fanslyAccountId),
      warnings,
    },
  }
}

function newestFanSortKey(f: CrmFanListItem): number {
  const sub = f.subscription_start?.trim()
    ? new Date(f.subscription_start).getTime()
    : NaN
  const created = f.created_at?.trim() ? new Date(f.created_at).getTime() : NaN
  const best = Math.max(
    Number.isFinite(sub) ? sub : 0,
    Number.isFinite(created) ? created : 0,
  )
  return best
}

/** Prefer active subscribers; then newest by subscription start / CRM created. */
export function pickNewestFansForCupid(fans: CrmFanListItem[], limit: number): CrmFanListItem[] {
  const cap = Math.min(Math.max(limit, 5), 40)
  const statusOf = (f: CrmFanListItem) =>
    (f.subscription_status_raw || 'active').toLowerCase().trim()

  const active = fans.filter((f) => {
    const s = statusOf(f)
    return s === 'active' || s === 'pending' || !s
  })
  const pool = active.length > 0 ? active : fans

  return [...pool].sort((a, b) => newestFanSortKey(b) - newestFanSortKey(a)).slice(0, cap)
}
