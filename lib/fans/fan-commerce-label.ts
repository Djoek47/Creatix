import type { Fan } from '@/lib/types'
import { formatFanCurrency } from '@/lib/fans/crm-format'

function ts(iso: string | null | undefined): number {
  if (iso == null || !String(iso).trim()) return NaN
  const t = Date.parse(String(iso).trim())
  return Number.isFinite(t) ? t : NaN
}

/**
 * Gallery/table subtitle: tier + price when available; otherwise CRM status and period.
 */
export function fanSubscriptionCommerceLine(fan: Fan): string {
  const priceRaw = fan.subscription_price
  const price =
    priceRaw != null && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null

  let kind = fan.subscription_account_type ?? 'unknown'
  if (kind === 'unknown' && price !== null) {
    kind = price <= 0 ? 'free' : 'paid'
  }

  if (kind === 'free' || price === 0) {
    return 'Free follow'
  }
  if (kind === 'paid' || (price !== null && price > 0)) {
    return price != null && price > 0 ? `Paid · $${formatFanCurrency(price)}` : 'Paid subscription'
  }

  const sl = (fan.subscription_status ?? '').trim().toLowerCase()

  const periodEndTs = ts(fan.subscription_expires_at ?? null)
  const renewTs = ts(fan.subscription_renews_on ?? null)
  const endMs =
    Number.isFinite(periodEndTs) ? periodEndTs : Number.isFinite(renewTs) ? renewTs : NaN

  const expiredByStatus = sl === 'expired'
  const past = Number.isFinite(endMs) && endMs <= Date.now()
  if (expiredByStatus || past) {
    return 'Subscription ended'
  }

  const future = Number.isFinite(endMs) && endMs > Date.now()
  if (sl === 'active' || sl === 'pending' || future) {
    if (price !== null && price > 0) return `Paid · $${formatFanCurrency(price)}`
    return future || sl === 'active' || sl === 'pending' ? 'Active subscription' : 'Subscribed'
  }

  if (typeof fan.subscription_status === 'string' && fan.subscription_status.trim()) {
    const raw = fan.subscription_status.trim()
    return raw.slice(0, 1).toUpperCase() + raw.slice(1).toLowerCase()
  }

  return 'Listed price not synced'
}
