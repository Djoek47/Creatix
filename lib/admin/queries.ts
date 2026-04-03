import { createServiceRoleClient } from '@/lib/supabase/server'

function sinceDaysIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

export async function adminOverviewStats() {
  const supabase = createServiceRoleClient()
  const since30 = sinceDaysIso(30)
  const since7 = sinceDaysIso(7)

  const { data: usage30 } = await supabase
    .from('ai_usage_events')
    .select('estimated_usd, input_tokens, output_tokens')
    .gte('created_at', since30)

  const { data: usage7 } = await supabase
    .from('ai_usage_events')
    .select('estimated_usd')
    .gte('created_at', since7)

  const { count: err30 } = await supabase
    .from('api_error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since30)

  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

  const sumUsd = (rows: { estimated_usd?: number | string | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.estimated_usd ?? 0), 0)

  const sumTok = (rows: { input_tokens?: number; output_tokens?: number }[] | null) =>
    (rows ?? []).reduce(
      (s, r) => s + Number(r.input_tokens ?? 0) + Number(r.output_tokens ?? 0),
      0,
    )

  return {
    estimatedUsd30d: sumUsd(usage30 ?? []),
    estimatedUsd7d: sumUsd(usage7 ?? []),
    tokens30d: sumTok(usage30 ?? []),
    errors30d: err30 ?? 0,
    profiles: userCount ?? 0,
  }
}

export type UserUsageRow = {
  user_id: string
  email: string | null
  full_name: string | null
  estimated_usd: number
  events: number
  tokens: number
}

export async function adminUsersUsageSummary(limit = 200): Promise<UserUsageRow[]> {
  const supabase = createServiceRoleClient()
  const since = sinceDaysIso(30)

  const { data: events } = await supabase
    .from('ai_usage_events')
    .select('user_id, estimated_usd, input_tokens, output_tokens')
    .gte('created_at', since)
    .not('user_id', 'is', null)

  const byUser = new Map<string, { usd: number; n: number; tok: number }>()
  for (const row of events ?? []) {
    const uid = String((row as { user_id: string }).user_id)
    const cur = byUser.get(uid) ?? { usd: 0, n: 0, tok: 0 }
    cur.usd += Number((row as { estimated_usd?: number }).estimated_usd ?? 0)
    cur.n += 1
    cur.tok +=
      Number((row as { input_tokens?: number }).input_tokens ?? 0) +
      Number((row as { output_tokens?: number }).output_tokens ?? 0)
    byUser.set(uid, cur)
  }

  const sorted = [...byUser.entries()].sort((a, b) => b[1].usd - a[1].usd).slice(0, limit)

  const ids = sorted.map(([id]) => id)
  if (ids.length === 0) return []

  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', ids)

  const profMap = new Map((profiles ?? []).map((p) => [String((p as { id: string }).id), p as { email?: string | null; full_name?: string | null }]))

  return sorted.map(([user_id, agg]) => {
    const p = profMap.get(user_id)
    return {
      user_id,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
      estimated_usd: Math.round(agg.usd * 10000) / 10000,
      events: agg.n,
      tokens: agg.tok,
    }
  })
}

export async function adminUserDetail(userId: string) {
  const supabase = createServiceRoleClient()
  const since = sinceDaysIso(90)

  const [{ data: profile }, { data: usage }, { data: errors }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, created_at').eq('id', userId).maybeSingle(),
    supabase
      .from('ai_usage_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('api_error_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const usageSum = (usage ?? []).reduce((s, r) => s + Number((r as { estimated_usd?: number }).estimated_usd ?? 0), 0)

  return { profile, usage: usage ?? [], errors: errors ?? [], usageSumUsd90d: usageSum }
}

export async function adminRecentErrors(limit = 100, routeContains?: string) {
  const supabase = createServiceRoleClient()
  let q = supabase.from('api_error_logs').select('*').order('created_at', { ascending: false }).limit(limit)
  const f = routeContains?.trim().replace(/%/g, '')
  if (f) q = q.ilike('route', `%${f}%`)
  const { data } = await q
  return data ?? []
}

export async function adminListUnitCosts() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('ai_unit_costs').select('*').order('model_key')
  return data ?? []
}

export type AdminDirectoryRow = {
  user_id: string
  email: string | null
  full_name: string | null
  role: string | null
  created_at: string | null
  estimated_usd_30d: number
  events_30d: number
  tokens_30d: number
}

/** Profiles merged with 30d usage; for admin user table search/sort. */
export async function adminDirectoryRows(opts: {
  q?: string
  sort?: 'usage' | 'created' | 'email'
  limit?: number
}): Promise<AdminDirectoryRow[]> {
  const supabase = createServiceRoleClient()
  const limit = Math.min(opts.limit ?? 150, 400)
  const since = sinceDaysIso(30)

  const { data: usageRows } = await supabase
    .from('ai_usage_events')
    .select('user_id, estimated_usd, input_tokens, output_tokens')
    .gte('created_at', since)
    .not('user_id', 'is', null)

  const usageMap = new Map<string, { usd: number; events: number; tokens: number }>()
  for (const row of usageRows ?? []) {
    const uid = String((row as { user_id: string }).user_id)
    const cur = usageMap.get(uid) ?? { usd: 0, events: 0, tokens: 0 }
    cur.usd += Number((row as { estimated_usd?: number }).estimated_usd ?? 0)
    cur.events += 1
    cur.tokens +=
      Number((row as { input_tokens?: number }).input_tokens ?? 0) +
      Number((row as { output_tokens?: number }).output_tokens ?? 0)
    usageMap.set(uid, cur)
  }

  let pq = supabase.from('profiles').select('id, email, full_name, role, created_at').limit(800)
  const q = opts.q?.trim()
  if (q) {
    const safe = q.replace(/%/g, '').replace(/,/g, '')
    if (safe.length) pq = pq.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
  }
  const { data: profiles } = await pq

  let rows: AdminDirectoryRow[] = (profiles ?? []).map((p) => {
    const id = String((p as { id: string }).id)
    const u = usageMap.get(id)
    return {
      user_id: id,
      email: (p as { email?: string | null }).email ?? null,
      full_name: (p as { full_name?: string | null }).full_name ?? null,
      role: (p as { role?: string | null }).role ?? null,
      created_at: (p as { created_at?: string | null }).created_at ?? null,
      estimated_usd_30d: Math.round((u?.usd ?? 0) * 10000) / 10000,
      events_30d: u?.events ?? 0,
      tokens_30d: u?.tokens ?? 0,
    }
  })

  const sort = opts.sort ?? 'usage'
  if (sort === 'created') {
    rows.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
  } else if (sort === 'email') {
    rows.sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
  } else {
    rows.sort((a, b) => b.estimated_usd_30d - a.estimated_usd_30d)
  }

  return rows.slice(0, limit)
}

export type UsageDailyPoint = {
  day: string
  estimated_usd: number
  events: number
  tokens: number
}

export async function adminUserUsageDailySeries(userId: string, days = 30): Promise<UsageDailyPoint[]> {
  const supabase = createServiceRoleClient()
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('admin_v_user_usage_daily')
    .select('day_utc, estimated_usd_sum, event_count, total_tokens_sum')
    .eq('user_id', userId)
    .gte('day_utc', startDate)
    .order('day_utc', { ascending: true })

  if (!error && data?.length) {
    return (data as { day_utc: string; estimated_usd_sum: number; event_count: number; total_tokens_sum: number }[]).map(
      (r) => ({
        day: String(r.day_utc).slice(0, 10),
        estimated_usd: Number(r.estimated_usd_sum ?? 0),
        events: Number(r.event_count ?? 0),
        tokens: Number(r.total_tokens_sum ?? 0),
      }),
    )
  }

  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data: ev } = await supabase
    .from('ai_usage_events')
    .select('created_at, estimated_usd, input_tokens, output_tokens, total_tokens')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  const byDay = new Map<string, { usd: number; events: number; tokens: number }>()
  for (const row of ev ?? []) {
    const r = row as {
      created_at: string
      estimated_usd?: number
      input_tokens?: number
      output_tokens?: number
      total_tokens?: number
    }
    const day = r.created_at.slice(0, 10)
    const cur = byDay.get(day) ?? { usd: 0, events: 0, tokens: 0 }
    cur.usd += Number(r.estimated_usd ?? 0)
    cur.events += 1
    const tt =
      r.total_tokens != null
        ? Number(r.total_tokens)
        : Number(r.input_tokens ?? 0) + Number(r.output_tokens ?? 0)
    cur.tokens += tt
    byDay.set(day, cur)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      day,
      estimated_usd: Math.round(v.usd * 1e6) / 1e6,
      events: v.events,
      tokens: v.tokens,
    }))
}

export async function adminUserPlatformConnections(userId: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('platform, is_connected, platform_username, last_sync_at, updated_at')
    .eq('user_id', userId)
    .order('platform')
  return data ?? []
}

export async function adminRecentAuditLog(limit = 100) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
