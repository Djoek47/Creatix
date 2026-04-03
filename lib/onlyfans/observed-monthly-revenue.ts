/**
 * Derive a single monthly revenue figure from OnlyFans API payloads for tier enforcement.
 * Prefer calendar "this month" from stats/earnings; fall back to sum of chart points (approx. last N days).
 */
export function observedMonthlyRevenueUsdFromOnlyFansSignals(opts: {
  stats?: { earnings?: { thisMonth?: number } } | null
  earnings?: { thisMonth?: number; this_day?: number; today?: number } | null
  chartPoints?: ReadonlyArray<{ amount?: number }> | null
}): number | null {
  const fromStats = opts.stats?.earnings?.thisMonth
  if (typeof fromStats === 'number' && Number.isFinite(fromStats) && fromStats >= 0) {
    return fromStats
  }
  const e = opts.earnings
  const fromEarnings = e?.thisMonth
  if (typeof fromEarnings === 'number' && Number.isFinite(fromEarnings) && fromEarnings >= 0) {
    return fromEarnings
  }
  const pts = opts.chartPoints
  if (pts && pts.length > 0) {
    const sum = pts.reduce((s, p) => s + (typeof p.amount === 'number' && Number.isFinite(p.amount) ? p.amount : 0), 0)
    if (sum > 0) return sum
  }
  return null
}
