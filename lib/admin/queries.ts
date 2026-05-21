import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAppCreditUsdEstimate } from '@/lib/admin/credit-usd'
import { effectiveMonthlyCreditLimit } from '@/lib/billing/credit-economics'
import { resolveAdminOverviewRange, type AdminOverviewRangeMode } from '@/lib/admin/time-range'
import {
  estimateCashForCredits,
  estimateCreditsForFeatureUsd,
  getFeatureUsdPerCredit,
  getHybridCreditModel,
  type HybridCreditModel,
} from '@/lib/admin/hybrid-credit-model'

function sinceDaysIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

export type AiProviderBucket = 'openai' | 'gateway' | 'grok' | 'anthropic' | 'serper' | 'google' | 'other'

const PROVIDER_BUCKET_LABEL: Record<AiProviderBucket, string> = {
  openai: 'OpenAI',
  gateway: 'AI Gateway',
  grok: 'xAI / Grok',
  anthropic: 'Anthropic',
  serper: 'Serper',
  google: 'Google',
  other: 'Other',
}

export function bucketAiProvider(provider: string): AiProviderBucket {
  const p = String(provider ?? '')
    .toLowerCase()
    .trim()
  if (!p) return 'other'
  if (p.includes('serper')) return 'serper'
  if (p.includes('grok') || p.includes('xai')) return 'grok'
  if (p.includes('anthropic') || p.includes('claude')) return 'anthropic'
  if (p.includes('google') || p.includes('gemini')) return 'google'
  if (p === 'openai' || p.startsWith('openai')) return 'openai'
  if (p.includes('gateway')) return 'gateway'
  return 'other'
}

export function providerBucketDisplayName(key: AiProviderBucket): string {
  return PROVIDER_BUCKET_LABEL[key]
}

async function fetchUsageEventsSince(
  supabase: ReturnType<typeof createServiceRoleClient>,
  sinceIso: string,
  untilIso?: string,
  maxRows = 40_000,
): Promise<
  {
    estimated_usd: number | string | null
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
    provider: string
    user_id: string | null
    feature: string
  }[]
> {
  const pageSize = 1000
  const out: {
    estimated_usd: number | string | null
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
    provider: string
    user_id: string | null
    feature: string
  }[] = []
  for (let from = 0; from < maxRows; from += pageSize) {
    let q = supabase
      .from('ai_usage_events')
      .select('estimated_usd, input_tokens, output_tokens, total_tokens, provider, user_id, feature')
      .gte('created_at', sinceIso)
    if (untilIso) {
      q = q.lte('created_at', untilIso)
    }
    const { data, error } = await q.order('created_at', { ascending: false }).range(from, from + pageSize - 1)
    if (error) break
    const rows = data ?? []
    out.push(...(rows as typeof out))
    if (rows.length < pageSize) break
  }
  return out
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

export type ProviderSpendRow = {
  bucket: AiProviderBucket
  label: string
  estimated_usd: number
  tokens: number
  events: number
}

/** Grouped by `ai_usage_events.feature` (tool / route slug). */
export type FeatureSpendRow = {
  feature: string
  estimated_usd: number
  tokens: number
  events: number
}

export type FeatureProviderSpendRow = {
  feature: string
  bucket: AiProviderBucket
  label: string
  estimated_usd: number
  tokens: number
  events: number
}

export type UsageByToolRow = {
  feature: string
  estimated_usd: number
  estimated_credits: number
  effective_cash_usd: number
  usd_per_credit: number
  tokens: number
  events: number
}

export type UsageByUserRow = {
  user_id: string
  email: string | null
  full_name: string | null
  estimated_usd: number
  estimated_credits: number
  effective_cash_usd: number
  tokens: number
  events: number
}

export type CommunityTipModerationRow = {
  id: string
  title: string
  body: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  user_id: string
  author_name: string | null
  author_email: string | null
}

export type CommunityTipCounts = {
  pending: number
  approved: number
  rejected: number
}

export type AdminOverviewExtended = Awaited<ReturnType<typeof adminOverviewStats>> & {
  /** Selected time window (from URL filter). */
  rangeTitle: string
  rangeMode: AdminOverviewRangeMode
  rangeSinceIso: string
  rangeUntilIso: string
  totalTokens30d: number
  providerRows: ProviderSpendRow[]
  /** Rollup by feature (service) — token-based USD from ai_unit_costs. */
  featureRows: FeatureSpendRow[]
  /** Feature × provider bucket (top rows by USD for display). */
  featureProviderRows: FeatureProviderSpendRow[]
  topUsers: UserUsageRow[]
  usageByToolRows: UsageByToolRow[]
  usageByUserRows: UsageByUserRow[]
  hybridCreditModel: HybridCreditModel
  creditsModeledInWindow: number
  creditsCashEquivalentInWindow: number
  /** Sum of subscriptions.ai_credits_used (in-app “AI credit” meter). */
  appAiCreditsUsedTotal: number
  /** USD display equivalent: appAiCreditsUsedTotal × appCreditUsdRate (see ADMIN_APP_CREDIT_USD_ESTIMATE). */
  appCreditsUsdEquivalent: number
  appCreditUsdRate: number
  walletTotalRemainingAllUsers: number
  walletIncludedRemainingAllUsers: number
  walletPurchasedRemainingAllUsers: number
  walletRowsCount: number
  /** Subscriptions rows counted for credits sum. */
  subscriptionsRowCount: number
  authUsersTotal: number
  authSignedInLast7d: number
  authSignedInLast30d: number
  /** Sum of (last_sign_in_at − created_at) in hours, users with both set — not wall-clock session time. */
  aggregateSignInSpanHours: number
  usageEventsTruncated: boolean
  /** Outbound DMs logged in message_send_events for the window. */
  messageSendsInWindow: number
  communityTipCounts: CommunityTipCounts
  /** Divine voice surface time (ms) summed across users for UTC days in range. */
  voiceStateMs: { idle: number; working: number; speaking: number; total: number }
}

async function countMessageSendsInRange(
  supabase: ReturnType<typeof createServiceRoleClient>,
  sinceIso: string,
  untilIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('message_send_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sinceIso)
    .lte('created_at', untilIso)
  if (error) return 0
  return count ?? 0
}

async function sumVoiceStateMsForDayRange(
  supabase: ReturnType<typeof createServiceRoleClient>,
  dayStart: string,
  dayEnd: string,
): Promise<{ idle: number; working: number; speaking: number; total: number }> {
  const { data, error } = await supabase
    .from('divine_voice_state_daily')
    .select('idle_ms, working_ms, speaking_ms')
    .gte('day_utc', dayStart)
    .lte('day_utc', dayEnd)
  if (error || !data?.length) {
    return { idle: 0, working: 0, speaking: 0, total: 0 }
  }
  let idle = 0
  let working = 0
  let speaking = 0
  for (const row of data as { idle_ms?: number; working_ms?: number; speaking_ms?: number }[]) {
    idle += Number(row.idle_ms ?? 0)
    working += Number(row.working_ms ?? 0)
    speaking += Number(row.speaking_ms ?? 0)
  }
  return { idle, working, speaking, total: idle + working + speaking }
}

async function getCommunityTipCounts(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<CommunityTipCounts> {
  const { data, error } = await supabase.from('community_tips').select('status').limit(5000)
  if (error || !data?.length) {
    return { pending: 0, approved: 0, rejected: 0 }
  }
  const counts: CommunityTipCounts = { pending: 0, approved: 0, rejected: 0 }
  for (const row of data as { status?: string }[]) {
    const status = String(row.status ?? '').toLowerCase()
    if (status === 'pending') counts.pending += 1
    else if (status === 'approved') counts.approved += 1
    else if (status === 'rejected') counts.rejected += 1
  }
  return counts
}

/** Overview metrics + per-user top list, provider buckets, app credits, auth activity. */
export async function adminOverviewExtended(
  rangeParams?: { range?: string | null; day?: string | null },
): Promise<AdminOverviewExtended> {
  const supabase = createServiceRoleClient()
  const range = resolveAdminOverviewRange(rangeParams ?? {})
  const since7 = sinceDaysIso(7)

  const [
    events30,
    topUsers,
    subsAgg,
    walletsAgg,
    authAgg,
    usage7,
    errWindow,
    profCount,
    messageSendsInWindow,
    voiceStateMs,
    communityTipCounts,
  ] =
    await Promise.all([
      fetchUsageEventsSince(supabase, range.sinceIso, range.untilIso),
      adminUsersUsageSummary(12, range.sinceIso, range.untilIso),
      supabase.from('subscriptions').select('ai_credits_used'),
      supabase.from('credit_wallets').select('included_credits_remaining,purchased_credits_remaining'),
      collectAuthActivityStats(supabase),
      supabase.from('ai_usage_events').select('estimated_usd').gte('created_at', since7),
      supabase
        .from('api_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', range.sinceIso)
        .lte('created_at', range.untilIso),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      countMessageSendsInRange(supabase, range.sinceIso, range.untilIso),
      sumVoiceStateMsForDayRange(supabase, range.voiceDayStart, range.voiceDayEnd),
      getCommunityTipCounts(supabase),
    ])

  const estimatedUsd30d = events30.reduce((s, r) => s + Number(r.estimated_usd ?? 0), 0)
  const estimatedUsd7d = (usage7.data ?? []).reduce((s, r) => s + Number((r as { estimated_usd?: number }).estimated_usd ?? 0), 0)

  const usageEventsTruncated = events30.length >= 40_000

  const byBucket = new Map<
    AiProviderBucket,
    { usd: number; tokens: number; events: number }
  >()
  for (const k of Object.keys(PROVIDER_BUCKET_LABEL) as AiProviderBucket[]) {
    byBucket.set(k, { usd: 0, tokens: 0, events: 0 })
  }

  let totalTokens30d = 0
  for (const row of events30) {
    const b = bucketAiProvider(row.provider)
    const agg = byBucket.get(b)!
    const usd = Number(row.estimated_usd ?? 0)
    const tt =
      row.total_tokens != null && Number(row.total_tokens) > 0
        ? Number(row.total_tokens)
        : Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0)
    agg.usd += usd
    agg.tokens += tt
    agg.events += 1
    totalTokens30d += tt
  }

  const providerRows: ProviderSpendRow[] = [...byBucket.entries()]
    .map(([bucket, v]) => ({
      bucket,
      label: providerBucketDisplayName(bucket),
      estimated_usd: Math.round(v.usd * 1e6) / 1e6,
      tokens: v.tokens,
      events: v.events,
    }))
    .filter((r) => r.events > 0)
    .sort((a, b) => b.estimated_usd - a.estimated_usd)

  const byFeature = new Map<string, { usd: number; tokens: number; events: number }>()
  const byFeatureProvider = new Map<string, { feature: string; bucket: AiProviderBucket; usd: number; tokens: number; events: number }>()
  for (const row of events30) {
    const feat = String(row.feature ?? 'unknown').trim() || 'unknown'
    const tt =
      row.total_tokens != null && Number(row.total_tokens) > 0
        ? Number(row.total_tokens)
        : Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0)
    const usd = Number(row.estimated_usd ?? 0)
    const curF = byFeature.get(feat) ?? { usd: 0, tokens: 0, events: 0 }
    curF.usd += usd
    curF.tokens += tt
    curF.events += 1
    byFeature.set(feat, curF)

    const b = bucketAiProvider(row.provider)
    const fpKey = `${feat}\0${b}`
    const curFp = byFeatureProvider.get(fpKey) ?? { feature: feat, bucket: b, usd: 0, tokens: 0, events: 0 }
    curFp.usd += usd
    curFp.tokens += tt
    curFp.events += 1
    byFeatureProvider.set(fpKey, curFp)
  }

  const featureRows: FeatureSpendRow[] = [...byFeature.entries()]
    .map(([feature, v]) => ({
      feature,
      estimated_usd: Math.round(v.usd * 1e6) / 1e6,
      tokens: v.tokens,
      events: v.events,
    }))
    .sort((a, b) => b.estimated_usd - a.estimated_usd)

  const featureProviderRows: FeatureProviderSpendRow[] = [...byFeatureProvider.values()]
    .map((v) => ({
      feature: v.feature,
      bucket: v.bucket,
      label: providerBucketDisplayName(v.bucket),
      estimated_usd: Math.round(v.usd * 1e6) / 1e6,
      tokens: v.tokens,
      events: v.events,
    }))
    .sort((a, b) => b.estimated_usd - a.estimated_usd)
    .slice(0, 40)

  const hybridCreditModel = getHybridCreditModel()
  const usageByToolRows: UsageByToolRow[] = featureRows.map((row) => {
    const estimatedCredits = estimateCreditsForFeatureUsd(row.feature, row.estimated_usd, hybridCreditModel)
    return {
      feature: row.feature,
      estimated_usd: row.estimated_usd,
      estimated_credits: Math.round(estimatedCredits * 10000) / 10000,
      effective_cash_usd: Math.round(estimateCashForCredits(estimatedCredits, hybridCreditModel) * 1e6) / 1e6,
      usd_per_credit: getFeatureUsdPerCredit(row.feature, hybridCreditModel),
      tokens: row.tokens,
      events: row.events,
    }
  })

  const byUser = new Map<string, { usd: number; credits: number; tokens: number; events: number }>()
  for (const row of events30) {
    if (!row.user_id) continue
    const feature = String(row.feature ?? 'unknown').trim() || 'unknown'
    const usd = Number(row.estimated_usd ?? 0)
    const credits = estimateCreditsForFeatureUsd(feature, usd, hybridCreditModel)
    const tt =
      row.total_tokens != null && Number(row.total_tokens) > 0
        ? Number(row.total_tokens)
        : Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0)
    const cur = byUser.get(row.user_id) ?? { usd: 0, credits: 0, tokens: 0, events: 0 }
    cur.usd += usd
    cur.credits += credits
    cur.tokens += tt
    cur.events += 1
    byUser.set(row.user_id, cur)
  }
  const usageByUserIds = [...byUser.keys()].slice(0, 1200)
  const { data: usageByUserProfiles } = usageByUserIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', usageByUserIds)
    : { data: [] as { id: string; email: string | null; full_name: string | null }[] }
  const userProfileMap = new Map(
    (usageByUserProfiles ?? []).map((row) => [
      String((row as { id: string }).id),
      row as { email?: string | null; full_name?: string | null },
    ]),
  )
  const usageByUserRows: UsageByUserRow[] = [...byUser.entries()]
    .map(([userId, row]) => {
      const p = userProfileMap.get(userId)
      return {
        user_id: userId,
        email: p?.email ?? null,
        full_name: p?.full_name ?? null,
        estimated_usd: Math.round(row.usd * 1e6) / 1e6,
        estimated_credits: Math.round(row.credits * 10000) / 10000,
        effective_cash_usd: Math.round(estimateCashForCredits(row.credits, hybridCreditModel) * 1e6) / 1e6,
        tokens: row.tokens,
        events: row.events,
      }
    })
    .sort((a, b) => b.effective_cash_usd - a.effective_cash_usd)
    .slice(0, 25)

  const creditsModeledInWindow = usageByToolRows.reduce((sum, row) => sum + row.estimated_credits, 0)
  const creditsCashEquivalentInWindow = usageByToolRows.reduce((sum, row) => sum + row.effective_cash_usd, 0)

  const subsRows = subsAgg.data ?? []
  const appAiCreditsUsedTotal = subsRows.reduce(
    (s, r) => s + Number((r as { ai_credits_used?: number }).ai_credits_used ?? 0),
    0,
  )
  const appCreditUsdRate = getAppCreditUsdEstimate()
  const appCreditsUsdEquivalent = Math.round(appAiCreditsUsedTotal * appCreditUsdRate * 1e6) / 1e6
  const walletRows = walletsAgg.data ?? []
  const walletIncludedRemainingAllUsers = walletRows.reduce(
    (sum, row) => sum + Number((row as { included_credits_remaining?: number }).included_credits_remaining ?? 0),
    0,
  )
  const walletPurchasedRemainingAllUsers = walletRows.reduce(
    (sum, row) => sum + Number((row as { purchased_credits_remaining?: number }).purchased_credits_remaining ?? 0),
    0,
  )
  const walletTotalRemainingAllUsers = walletIncludedRemainingAllUsers + walletPurchasedRemainingAllUsers

  return {
    estimatedUsd30d,
    estimatedUsd7d,
    tokens30d: totalTokens30d,
    errors30d: errWindow.count ?? 0,
    profiles: profCount.count ?? 0,
    rangeTitle: range.title,
    rangeMode: range.mode,
    rangeSinceIso: range.sinceIso,
    rangeUntilIso: range.untilIso,
    totalTokens30d,
    providerRows,
    featureRows,
    featureProviderRows,
    topUsers,
    usageByToolRows,
    usageByUserRows,
    hybridCreditModel,
    creditsModeledInWindow,
    creditsCashEquivalentInWindow,
    appAiCreditsUsedTotal,
    appCreditsUsdEquivalent,
    appCreditUsdRate,
    subscriptionsRowCount: subsRows.length,
    walletTotalRemainingAllUsers,
    walletIncludedRemainingAllUsers,
    walletPurchasedRemainingAllUsers,
    walletRowsCount: walletRows.length,
    authUsersTotal: authAgg.total,
    authSignedInLast7d: authAgg.signedIn7d,
    authSignedInLast30d: authAgg.signedIn30d,
    aggregateSignInSpanHours: authAgg.aggregateSignInSpanHours,
    usageEventsTruncated,
    messageSendsInWindow,
    communityTipCounts,
    voiceStateMs,
  }
}

async function collectAuthActivityStats(supabase: ReturnType<typeof createServiceRoleClient>): Promise<{
  total: number
  signedIn7d: number
  signedIn30d: number
  aggregateSignInSpanHours: number
}> {
  const since7 = new Date(Date.now() - 7 * 86400000)
  const since30 = new Date(Date.now() - 30 * 86400000)
  let total = 0
  let signedIn7d = 0
  let signedIn30d = 0
  let aggregateSignInSpanHours = 0
  try {
    let page = 1
    const perPage = 1000
    while (page <= 100) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error) break
      const users = data?.users ?? []
      if (users.length === 0) break
      for (const u of users) {
        total += 1
        const last = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
        const created = u.created_at ? new Date(u.created_at) : null
        if (last && last >= since30) signedIn30d += 1
        if (last && last >= since7) signedIn7d += 1
        if (last && created && last >= created) {
          aggregateSignInSpanHours += (last.getTime() - created.getTime()) / 3600000
        }
      }
      if (users.length < perPage) break
      page += 1
    }
  } catch {
    // Auth admin API unavailable or misconfigured
  }
  return { total, signedIn7d, signedIn30d, aggregateSignInSpanHours }
}

export type UserUsageRow = {
  user_id: string
  email: string | null
  full_name: string | null
  estimated_usd: number
  events: number
  tokens: number
}

export async function adminUsersUsageSummary(
  limit = 200,
  sinceIso?: string,
  untilIso?: string,
): Promise<UserUsageRow[]> {
  const supabase = createServiceRoleClient()
  const since = sinceIso ?? sinceDaysIso(30)

  let q = supabase
    .from('ai_usage_events')
    .select('user_id, estimated_usd, input_tokens, output_tokens')
    .gte('created_at', since)
    .not('user_id', 'is', null)
  if (untilIso) {
    q = q.lte('created_at', untilIso)
  }
  const { data: events } = await q

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

async function fetchUserUsageEventsForAggregation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  sinceIso: string,
  maxRows = 50_000,
): Promise<
  {
    feature: string
    provider: string
    estimated_usd: number | string | null
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
  }[]
> {
  const pageSize = 1000
  const out: {
    feature: string
    provider: string
    estimated_usd: number | string | null
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
  }[] = []
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await supabase
      .from('ai_usage_events')
      .select('feature, provider, estimated_usd, input_tokens, output_tokens, total_tokens')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) break
    const rows = data ?? []
    out.push(...(rows as typeof out))
    if (rows.length < pageSize) break
  }
  return out
}

export type UserSubscriptionUsageRow = {
  plan_id: string | null
  ai_credits_used: number
  ai_credits_limit: number
  messages_sent: number
}

export type UserUsageWebhookRow = {
  url: string
  enabled: boolean
  created_at: string | null
  updated_at: string | null
}

export async function adminUserDetail(userId: string) {
  const supabase = createServiceRoleClient()
  const since = sinceDaysIso(90)
  const dayStart90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const todayUtc = new Date().toISOString().slice(0, 10)

  const [
    { data: profile },
    { data: usage },
    { data: errors },
    { data: subscription },
    aggRows,
    msgCountRes,
    { data: voiceDailyRows },
    { data: creditWallet },
  ] = await Promise.all([
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
    supabase
      .from('subscriptions')
      .select(
        'plan_id, ai_credits_used, ai_credits_limit, messages_sent, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    fetchUserUsageEventsForAggregation(supabase, userId, since),
    supabase
      .from('message_send_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since),
    supabase
      .from('divine_voice_state_daily')
      .select('idle_ms, working_ms, speaking_ms')
      .eq('user_id', userId)
      .gte('day_utc', dayStart90)
      .lte('day_utc', todayUtc),
    supabase
      .from('credit_wallets')
      .select('included_credits_remaining,purchased_credits_remaining,included_cycle_end')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const webhookRes = await supabase
    .from('user_usage_webhook_endpoints')
    .select('url, enabled, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  const webhook = webhookRes.error ? null : webhookRes.data

  const usageSum = (usage ?? []).reduce((s, r) => s + Number((r as { estimated_usd?: number }).estimated_usd ?? 0), 0)

  const byFeature = new Map<string, { usd: number; tokens: number; events: number }>()
  const byBucket = new Map<AiProviderBucket, { usd: number; tokens: number; events: number }>()
  for (const k of Object.keys(PROVIDER_BUCKET_LABEL) as AiProviderBucket[]) {
    byBucket.set(k, { usd: 0, tokens: 0, events: 0 })
  }
  for (const row of aggRows) {
    const feat = String(row.feature ?? 'unknown').trim() || 'unknown'
    const tt =
      row.total_tokens != null && Number(row.total_tokens) > 0
        ? Number(row.total_tokens)
        : Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0)
    const usd = Number(row.estimated_usd ?? 0)
    const curF = byFeature.get(feat) ?? { usd: 0, tokens: 0, events: 0 }
    curF.usd += usd
    curF.tokens += tt
    curF.events += 1
    byFeature.set(feat, curF)
    const b = bucketAiProvider(row.provider)
    const agg = byBucket.get(b)!
    agg.usd += usd
    agg.tokens += tt
    agg.events += 1
  }

  const usageByFeature90d: FeatureSpendRow[] = [...byFeature.entries()]
    .map(([feature, v]) => ({
      feature,
      estimated_usd: Math.round(v.usd * 1e6) / 1e6,
      tokens: v.tokens,
      events: v.events,
    }))
    .sort((a, b) => b.estimated_usd - a.estimated_usd)

  const usageByProvider90d: ProviderSpendRow[] = [...byBucket.entries()]
    .map(([bucket, v]) => ({
      bucket,
      label: providerBucketDisplayName(bucket),
      estimated_usd: Math.round(v.usd * 1e6) / 1e6,
      tokens: v.tokens,
      events: v.events,
    }))
    .filter((r) => r.events > 0)
    .sort((a, b) => b.estimated_usd - a.estimated_usd)

  const sub = subscription as
    | (UserSubscriptionUsageRow & {
        billing_variant?: string | null
        revenue_tier?: number | null
        billing_focus_platform?: string | null
        billing_focus_platforms?: string[] | null
        billing_seats?: number | null
      })
    | null
    | undefined
  const wh = webhook as UserUsageWebhookRow | null | undefined
  const appCreditUsdRate = getAppCreditUsdEstimate()
  const creditsUsed = Number(sub?.ai_credits_used ?? 0)
  const creditsLimitEffective =
    sub != null
      ? effectiveMonthlyCreditLimit({
          plan_id: sub.plan_id,
          billing_variant: sub.billing_variant,
          revenue_tier: sub.revenue_tier,
          billing_focus_platform: sub.billing_focus_platform,
          billing_focus_platforms: sub.billing_focus_platforms,
          billing_seats: sub.billing_seats,
          ai_credits_limit: sub.ai_credits_limit,
        })
      : 0
  const appCreditsUsdEquivalent = Math.round(creditsUsed * appCreditUsdRate * 1e6) / 1e6

  let vIdle = 0
  let vWork = 0
  let vSpeak = 0
  for (const r of voiceDailyRows ?? []) {
    const row = r as { idle_ms?: number; working_ms?: number; speaking_ms?: number }
    vIdle += Number(row.idle_ms ?? 0)
    vWork += Number(row.working_ms ?? 0)
    vSpeak += Number(row.speaking_ms ?? 0)
  }
  const voiceState90d = {
    idle: vIdle,
    working: vWork,
    speaking: vSpeak,
    total: vIdle + vWork + vSpeak,
  }

  return {
    profile,
    usage: usage ?? [],
    errors: errors ?? [],
    usageSumUsd90d: usageSum,
    messageSendEvents90d: msgCountRes.error ? 0 : msgCountRes.count ?? 0,
    voiceState90d,
    subscription: sub
      ? {
          plan_id: sub.plan_id ?? null,
          ai_credits_used: creditsUsed,
          ai_credits_limit: creditsLimitEffective,
          messages_sent: Number(sub.messages_sent ?? 0),
        }
      : null,
    usageWebhook: wh
      ? {
          url: wh.url,
          enabled: wh.enabled,
          created_at: wh.created_at ?? null,
          updated_at: wh.updated_at ?? null,
        }
      : null,
    usageByFeature90d,
    usageByProvider90d,
    appCreditUsdRate,
    appCreditsUsdEquivalent,
    creditWallet: creditWallet
      ? {
          included_remaining: Number(
            (creditWallet as { included_credits_remaining?: number }).included_credits_remaining ?? 0,
          ),
          purchased_remaining: Number(
            (creditWallet as { purchased_credits_remaining?: number }).purchased_credits_remaining ?? 0,
          ),
          total_remaining:
            Number((creditWallet as { included_credits_remaining?: number }).included_credits_remaining ?? 0) +
            Number((creditWallet as { purchased_credits_remaining?: number }).purchased_credits_remaining ?? 0),
          included_cycle_end:
            (creditWallet as { included_cycle_end?: string | null }).included_cycle_end ?? null,
        }
      : null,
  }
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
  estimated_credits_30d: number
  cash_equivalent_usd_30d: number
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
    .select('user_id, feature, estimated_usd, input_tokens, output_tokens')
    .gte('created_at', since)
    .not('user_id', 'is', null)

  const hybridCreditModel = getHybridCreditModel()
  const usageMap = new Map<string, { usd: number; credits: number; events: number; tokens: number }>()
  for (const row of usageRows ?? []) {
    const uid = String((row as { user_id: string }).user_id)
    const cur = usageMap.get(uid) ?? { usd: 0, credits: 0, events: 0, tokens: 0 }
    const usd = Number((row as { estimated_usd?: number }).estimated_usd ?? 0)
    const feature = String((row as { feature?: string }).feature ?? 'unknown').trim() || 'unknown'
    cur.usd += usd
    cur.credits += estimateCreditsForFeatureUsd(feature, usd, hybridCreditModel)
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
      estimated_credits_30d: Math.round((u?.credits ?? 0) * 1000) / 1000,
      cash_equivalent_usd_30d:
        Math.round(estimateCashForCredits(u?.credits ?? 0, hybridCreditModel) * 10000) / 10000,
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

export async function adminCommunityTipsQueue(
  opts?: { status?: 'pending' | 'approved' | 'rejected' | 'all'; limit?: number },
): Promise<CommunityTipModerationRow[]> {
  const supabase = createServiceRoleClient()
  const status = opts?.status ?? 'pending'
  const limit = Math.min(Math.max(opts?.limit ?? 120, 1), 500)
  let query = supabase
    .from('community_tips')
    .select('id,title,body,status,created_at,updated_at,user_id')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  const { data, error } = await query
  if (error || !data?.length) return []

  const ids = [...new Set((data as { user_id: string }[]).map((row) => row.user_id))]
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] }
  const profileMap = new Map(
    (profiles ?? []).map((row) => [
      String((row as { id: string }).id),
      row as { full_name?: string | null; email?: string | null },
    ]),
  )

  return (data as {
    id: string
    title: string
    body: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    updated_at: string
    user_id: string
  }[]).map((row) => {
    const profile = profileMap.get(row.user_id)
    return {
      ...row,
      author_name: profile?.full_name ?? null,
      author_email: profile?.email ?? null,
    }
  })
}
