/**
 * GET /api/crm/fans
 * Unified fan list for CRM UIs: merges Supabase `fans` (rich CRM fields) with live
 * OnlyFans + Fansly subscriber lists when those platforms are connected.
 * Database rows win on duplicate (platform + platform_fan_id).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createFanslyAPI } from '@/lib/fansly-api'
import { normalizeFanFromRow } from '@/lib/fans/normalize-fan-row'
import { extractOnlyFansFanRows } from '@/lib/onlyfans/fan-list-extract'
import { fanDedupeKey, fanslyLiveToFan, onlyFansLiveRowToFan } from '@/lib/crm/fan-from-live'
import type { CrmFanListItem } from '@/lib/crm/crm-fan-types'
import type { Fan } from '@/lib/types'

function enrichDbFan(row: Record<string, unknown>, fan: Fan): CrmFanListItem {
  return {
    ...fan,
    creator_classification: (row.creator_classification as string | null | undefined) ?? null,
    subscription_tier_raw: (row.subscription_tier as string | null | undefined) ?? null,
    subscription_status_raw: (row.subscription_status as string | null | undefined) ?? null,
    _source: 'database',
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    /** `database` = DB only (fast). Default `hybrid` = DB + live OF/Fansly when connected. */
    const mode = (searchParams.get('mode') || 'hybrid') as 'hybrid' | 'database'
    const limitOf = Math.min(parseInt(searchParams.get('limit_of') || '150', 10), 200)
    const limitFansly = Math.min(parseInt(searchParams.get('limit_fansly') || '150', 10), 200)

    const { data: connections } = await supabase
      .from('platform_connections')
      .select('platform, access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .in('platform', ['onlyfans', 'fansly'])

    const ofConn = connections?.find((c) => c.platform === 'onlyfans')
    const fanslyConn = connections?.find((c) => c.platform === 'fansly')
    const ofToken = ofConn?.access_token ?? null
    const fanslyAccountId = fanslyConn?.access_token ?? fanslyConn?.platform_user_id ?? null

    const { data: dbRows, error: dbErr } = await supabase
      .from('fans')
      .select('*')
      .eq('user_id', user.id)
      .order('total_spent', { ascending: false })
      .limit(8000)

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
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
      if (ofToken) {
        try {
          const api = createOnlyFansAPI()
          api.setAccountId(ofToken)
          const raw = await api.getFansActive({ limit: limitOf, offset: 0 })
          const rows = extractOnlyFansFanRows(raw) as Record<string, unknown>[]
          for (const row of rows) {
            const fan = onlyFansLiveRowToFan(row, user.id)
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

      if (fanslyAccountId) {
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
              user.id,
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

    return NextResponse.json({
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
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load CRM fans'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
