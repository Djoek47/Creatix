/** Extract lifetime / total spend from partner OF/Fansly style fan objects (camel + snake variants). */

export function readPartnerTotalSpend(row: Record<string, unknown>): number {
  const candidates = [
    row.totalSpent,
    row.total_spent,
    row.totalSpend,
    row.total_spend,
    row.spentLifetime,
    row.spent_lifetime,
    row.lifetimeTotal,
    row.lifetime_total,
    row.netSpend,
    row.net_spend,
  ]
  let best = 0
  for (const c of candidates) {
    if (c == null || c === '') continue
    const n = Number(c)
    if (!Number.isFinite(n)) continue
    if (n > best) best = n
  }
  return Math.max(0, best)
}
