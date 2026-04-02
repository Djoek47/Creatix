/** Parse platform timestamps for CRM sync (OnlyFans / Fansly). */

export function parseIsoDateOrNull(value: unknown): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function subscriptionFieldsFromOnlyFansFan(fan: {
  expiresAt?: string
  renewsOn?: string | null
  isRenewOn?: boolean
}): {
  subscription_expires_at: string | null
  subscription_renews_on: string | null
  is_renewing: boolean
  subscription_status: 'active' | 'expired'
} {
  const subscription_expires_at = parseIsoDateOrNull(fan.expiresAt)
  const subscription_renews_on = parseIsoDateOrNull(fan.renewsOn)
  const expMs = subscription_expires_at ? new Date(subscription_expires_at).getTime() : NaN
  const expired = !Number.isNaN(expMs) && expMs < Date.now()
  return {
    subscription_expires_at,
    subscription_renews_on,
    is_renewing: fan.isRenewOn ?? true,
    subscription_status: expired ? 'expired' : 'active',
  }
}

export function subscriptionFieldsFromFanslyFan(fan: { expiresAt?: string }): {
  subscription_expires_at: string | null
  subscription_status: 'active' | 'expired'
} {
  const subscription_expires_at = parseIsoDateOrNull(fan.expiresAt)
  const expMs = subscription_expires_at ? new Date(subscription_expires_at).getTime() : NaN
  const expired = !Number.isNaN(expMs) && expMs < Date.now()
  return {
    subscription_expires_at,
    subscription_status: expired ? 'expired' : 'active',
  }
}
