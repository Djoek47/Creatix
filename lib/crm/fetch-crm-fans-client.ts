import type { CrmFanListItem, CrmFansResponse } from '@/lib/crm/crm-fan-types'

/** Hybrid list: CRM database merged with live OnlyFans + Fansly when connected. */
export async function fetchCrmFansHybrid(): Promise<CrmFansResponse> {
  const res = await fetch('/api/crm/fans?mode=hybrid', { credentials: 'include' })
  const data = (await res.json()) as CrmFansResponse & { error?: string }
  if (!res.ok) throw new Error(data.error || 'Could not load fans')
  return data
}

function handleFor(f: CrmFanListItem): string {
  return (f.platform_username || '').trim() || 'fan'
}

export type ChurnFanPickerRow = {
  id: string
  _source: NonNullable<CrmFanListItem['_source']>
  platform_fan_id: string
  username: string
  display_name: string | null
  total_spent: number | null
  platform: string
  subscription_expires_at: string | null
  subscription_renews_on: string | null
  subscription_status: string | null
}

/** Map unified CRM fan to churn predictor row shape. */
export function crmFanToChurnRow(f: CrmFanListItem): ChurnFanPickerRow {
  const pfid =
    (f.platform_fan_id != null && String(f.platform_fan_id).trim()) || String(f.id)
  return {
    id: f.id,
    _source: f._source ?? 'database',
    platform_fan_id: pfid,
    username: handleFor(f),
    display_name: f.display_name,
    total_spent: f.total_spent,
    platform: f.platform,
    subscription_expires_at: f.subscription_expires_at ?? null,
    subscription_renews_on: f.subscription_renews_on ?? null,
    subscription_status: f.subscription_status_raw ?? null,
  }
}

/** Hybrid "live" list fans are not `fans` table rows — churn API must use manual-style context. */
export function liveCrmFanToChurnFanData(row: ChurnFanPickerRow): string {
  if (row._source === 'database') return ''
  const src =
    row._source === 'live_onlyfans'
      ? 'OnlyFans live subscriber list (no CRM row merged yet)'
      : 'Fansly live subscriber list (no CRM row merged yet)'
  return [
    `${src}. Sync Fans / full CRM update so this fan gets a saved row, thread cache, and churn snapshots.`,
    `Platform: ${row.platform}`,
    `Platform fan id: ${row.platform_fan_id}`,
    `Fan: @${row.username}${row.display_name ? ` (${row.display_name})` : ''}`,
    `Approx. lifetime spend (live list): ${Number(row.total_spent ?? 0)}`,
    row.subscription_expires_at?.trim() ? `Subscription period end (live): ${row.subscription_expires_at}` : '',
    row.subscription_renews_on?.trim() ? `Renews on (live): ${row.subscription_renews_on}` : '',
    row.subscription_status?.trim() ? `Status: ${row.subscription_status}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Map unified CRM fan to fantasy-writer fan row shape. */
export function crmFanToFantasyRow(f: CrmFanListItem) {
  return {
    id: f.id,
    username: f.platform_username || null,
    platform_username: f.platform_username || null,
    display_name: f.display_name,
    total_spent: f.total_spent,
    platform: f.platform,
    notes: f.notes ?? null,
    tags: f.tags ?? [],
  }
}
