/**
 * Builds anonymized `creator_internal_benchmarks` from CRM data (fans table + platform niches).
 * Intended to strengthen Competitor Analysis with **your own cohort** once you have enough connected creators
 * (e.g. hundreds / 1000+). No individual creator ids are written to the benchmarks table.
 *
 * Thresholds: below MIN_CREATORS_TO_PUBLISH we clear published rows so the product does not imply precision.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const MIN_CREATORS_TO_PUBLISH = 25

export type FanCountRow = { user_id: string; platform: string; fan_count: number }

function nicheBucketFromNiches(niches: string[] | null | undefined): string {
  if (!niches?.length) return 'unspecified'
  const raw = niches[0]?.trim().toLowerCase().slice(0, 64) || ''
  const slug = raw.replace(/[^\w\- ]+/g, '').trim().slice(0, 64)
  return slug || 'unspecified'
}

function percentile(sorted: number[], p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  const idx = Math.min(n - 1, Math.max(0, Math.floor((n - 1) * p)))
  return sorted[idx]!
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export type ComputeBenchmarksResult = {
  published: boolean
  datasetCreatorTotal: number
  rowsUpserted: number
}

/**
 * Call with **service role** client so `internal_creator_crm_fan_counts` RPC is allowed.
 */
export async function computeAndUpsertInternalBenchmarks(
  supabase: SupabaseClient,
): Promise<ComputeBenchmarksResult> {
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('internal_creator_crm_fan_counts')
  if (rpcErr) {
    console.error('[computeInternalBenchmarks] rpc', rpcErr.message)
    return { published: false, datasetCreatorTotal: 0, rowsUpserted: 0 }
  }

  const counts = (rpcRows ?? []) as { user_id: string; platform: string; fan_count: number | string }[]
  const normalized: FanCountRow[] = counts.map((r) => ({
    user_id: String(r.user_id),
    platform: String(r.platform),
    fan_count: Number(r.fan_count) || 0,
  }))

  const { data: conns, error: connErr } = await supabase
    .from('platform_connections')
    .select('user_id, platform, niches')
    .eq('is_connected', true)

  if (connErr) {
    console.error('[computeInternalBenchmarks] connections', connErr.message)
    return { published: false, datasetCreatorTotal: 0, rowsUpserted: 0 }
  }

  const connMap = new Map<string, string[]>()
  for (const c of conns ?? []) {
    const uid = (c as { user_id?: string }).user_id
    const plat = (c as { platform?: string }).platform
    const niches = (c as { niches?: string[] | null }).niches
    if (!uid || !plat) continue
    connMap.set(`${uid}|${plat}`, Array.isArray(niches) ? niches : [])
  }

  const userTotalFans = new Map<string, number>()
  for (const row of normalized) {
    userTotalFans.set(row.user_id, (userTotalFans.get(row.user_id) ?? 0) + row.fan_count)
  }

  const datasetCreatorTotal = userTotalFans.size

  if (datasetCreatorTotal < MIN_CREATORS_TO_PUBLISH) {
    await supabase.from('creator_internal_benchmarks').delete().gte('creator_count', 0)
    return { published: false, datasetCreatorTotal, rowsUpserted: 0 }
  }

  const byBucket = new Map<string, number[]>()

  for (const row of normalized) {
    const niches = connMap.get(`${row.user_id}|${row.platform}`) ?? []
    const bucket = nicheBucketFromNiches(niches)
    const key = `${row.platform}|${bucket}`
    if (!byBucket.has(key)) byBucket.set(key, [])
    byBucket.get(key)!.push(row.fan_count)
  }

  const allTotals = Array.from(userTotalFans.values()).sort((a, b) => a - b)
  byBucket.set('all|unspecified', allTotals)

  const now = new Date().toISOString()
  const upsertRows: Record<string, unknown>[] = []

  for (const [key, fanCounts] of byBucket) {
    const [plat, ...rest] = key.split('|')
    const nichePart = rest.join('|') || 'unspecified'
    if (!plat || !['onlyfans', 'fansly', 'mym', 'all'].includes(plat)) continue
    const sorted = [...fanCounts].sort((a, b) => a - b)
    const n = sorted.length
    if (n === 0) continue
    upsertRows.push({
      platform: plat,
      niche_bucket: nichePart,
      creator_count: n,
      fan_count_p25: Math.round(percentile(sorted, 0.25)),
      fan_count_p50: Math.round(percentile(sorted, 0.5)),
      fan_count_p75: Math.round(percentile(sorted, 0.75)),
      fan_count_mean: Math.round(mean(sorted) * 10) / 10,
      dataset_creator_total: datasetCreatorTotal,
      computed_at: now,
    })
  }

  if (upsertRows.length === 0) {
    return { published: false, datasetCreatorTotal, rowsUpserted: 0 }
  }

  const { error: upErr } = await supabase.from('creator_internal_benchmarks').upsert(upsertRows, {
    onConflict: 'platform,niche_bucket',
  })
  if (upErr) {
    console.error('[computeInternalBenchmarks] upsert', upErr.message)
    return { published: false, datasetCreatorTotal, rowsUpserted: 0 }
  }

  return { published: true, datasetCreatorTotal, rowsUpserted: upsertRows.length }
}
