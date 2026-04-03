import { extractOnlyFansFanRows } from '@/lib/onlyfans/fan-list-extract'
import type { OnlyFansPartnerFanLike } from '@/lib/onlyfans/upsert-crm-fan-row'

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapFanRow(src: Record<string, unknown>): OnlyFansPartnerFanLike | null {
  const id = src.id ?? src.userId ?? src.user_id
  if (id == null) return null
  return {
    id,
    username: String(src.username ?? src.userName ?? '').trim() || undefined,
    name:
      src.name != null
        ? String(src.name)
        : src.displayName != null
          ? String(src.displayName)
          : undefined,
    avatar:
      src.avatar != null
        ? String(src.avatar)
        : src.avatarUrl != null
          ? String(src.avatarUrl)
          : null,
    subscribedAt:
      src.subscribedAt != null
        ? String(src.subscribedAt)
        : src.subscribed_at != null
          ? String(src.subscribed_at)
          : undefined,
    totalSpent: num(src.totalSpent ?? src.total_spent),
    subscriptionPrice:
      src.subscriptionPrice != null && src.subscriptionPrice !== ''
        ? num(src.subscriptionPrice)
        : src.subscription_price != null && src.subscription_price !== ''
          ? num(src.subscription_price)
          : null,
    expiresAt:
      src.expiresAt != null
        ? String(src.expiresAt)
        : src.expires_at != null
          ? String(src.expires_at)
          : undefined,
    renewsOn:
      src.renewsOn != null
        ? String(src.renewsOn)
        : src.renews_on != null
          ? String(src.renews_on)
          : null,
    isRenewOn:
      typeof src.isRenewOn === 'boolean'
        ? src.isRenewOn
        : typeof src.is_renew_on === 'boolean'
          ? src.is_renew_on
          : undefined,
  }
}

/** Normalize GET /fans/{id} (and variants) into a row we can upsert to CRM. */
export function partnerFanLikeFromUnknown(raw: unknown): OnlyFansPartnerFanLike | null {
  const rows = extractOnlyFansFanRows(raw)
  for (const row of rows) {
    if (row && typeof row === 'object') {
      const m = mapFanRow(row as Record<string, unknown>)
      if (m) return m
    }
  }
  const o = asRecord(raw)
  if (!o) return null
  const d = asRecord(o.data)
  const src = d && (d.id != null || d.userId != null || d.user_id != null) ? d : o
  return mapFanRow(src)
}
