export type DivineAuditEntry = {
  at: string
  mode: 'preview' | 'apply'
  actionCount: number
  okCount: number
  failCount: number
  source: string
  nonce: string
  envelopeIssuedAt?: string
  summary: string
}

export type DivineAuditFilter = {
  mode: 'all' | 'preview' | 'apply'
  failuresOnly: boolean
  search: string
  sort: 'newest' | 'oldest' | 'failures'
  timeRange: '15m' | '1h' | '24h' | 'all'
}

export function filterAndSortAuditEntries(
  entries: DivineAuditEntry[],
  filter: DivineAuditFilter,
  nowMs = Date.now(),
): DivineAuditEntry[] {
  const query = filter.search.trim().toLowerCase()
  const maxAgeMs =
    filter.timeRange === '15m'
      ? 15 * 60 * 1000
      : filter.timeRange === '1h'
        ? 60 * 60 * 1000
        : filter.timeRange === '24h'
          ? 24 * 60 * 60 * 1000
          : null

  const filtered = entries.filter((entry) => {
    if (maxAgeMs !== null) {
      const ageMs = nowMs - Date.parse(entry.at)
      if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) return false
    }
    if (filter.mode !== 'all' && entry.mode !== filter.mode) return false
    if (filter.failuresOnly && entry.failCount === 0) return false
    if (
      query &&
      !entry.source.toLowerCase().includes(query) &&
      !entry.nonce.toLowerCase().includes(query) &&
      !entry.summary.toLowerCase().includes(query)
    ) {
      return false
    }
    return true
  })

  const sorted = [...filtered]
  if (filter.sort === 'oldest') {
    sorted.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  } else if (filter.sort === 'failures') {
    sorted.sort((a, b) => b.failCount - a.failCount || Date.parse(b.at) - Date.parse(a.at))
  } else {
    sorted.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  }
  return sorted
}
