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

/** Map unified CRM fan to churn predictor row shape. */
export function crmFanToChurnRow(f: CrmFanListItem) {
  return {
    id: f.id,
    username: handleFor(f),
    display_name: f.display_name,
    total_spent: f.total_spent,
    platform: f.platform,
    subscription_expires_at: f.subscription_expires_at ?? null,
    subscription_status: f.subscription_status_raw ?? null,
  }
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
