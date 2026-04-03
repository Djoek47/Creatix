import type { FanslyAPI } from '@/lib/fansly-api'

/** Month-to-date earnings from Fansly statistics (UTC month), for revenue-tier scoping on `platform_connections`. */
export async function fanslyMonthToDateRevenueUsd(
  api: FanslyAPI,
  accountId: string,
): Promise<number | null> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const startDate = start.toISOString().split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]
  try {
    const e = await api.getEarnings(accountId, { startDate, endDate })
    if (typeof e.total !== 'number' || !Number.isFinite(e.total) || e.total < 0) return null
    return e.total
  } catch {
    return null
  }
}
