import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import type { SubscriptionLike } from '@/lib/billing/access'
import { canConnectAdultPartnerPlatform, isPaidSubscription } from '@/lib/billing/access'
import {
  connectedAdultPlatforms,
  focusConnectedPlatformsMismatch,
  resolveAllowedFocusPlatforms,
  type AdultBillingPlatform,
  type PlatformConnectionLike,
  type SubscriptionFocusFields,
} from '@/lib/billing/platform-variant'
import { clearOnlyFansDmMessageCacheForUser } from '@/lib/messages/of-dm-cache'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { notifyPlatformConnectionChange } from '@/lib/notifications/platform-connection-notify'

const FOCUS_ALIGN_PLATFORMS = ['onlyfans', 'fansly'] as const

type FocusAlignPlatform = (typeof FOCUS_ALIGN_PLATFORMS)[number]

export type AdultPartnerPlatformRow = {
  platform: string
  is_connected: boolean | null
  access_token?: string | null
  platform_username?: string | null
}

function platformLabel(p: AdultBillingPlatform): string {
  if (p === 'onlyfans') return 'OnlyFans'
  if (p === 'fansly') return 'Fansly'
  return 'ManyVids'
}

function buildConnectionsFromRows(
  rows: { platform: string; is_connected: boolean | null }[] | null | undefined,
): PlatformConnectionLike[] {
  const list: PlatformConnectionLike[] = []
  for (const r of rows ?? []) {
    if (r.is_connected === true) {
      list.push({ platform: r.platform, is_connected: true })
    }
  }
  return list
}

export type FocusAlignPreloaded = {
  subscription: (SubscriptionLike & Partial<SubscriptionFocusFields>) | null
  platformRows: AdultPartnerPlatformRow[]
}

async function disconnectListedAdultPlatforms(params: {
  supabase: SupabaseClient
  userId: string
  userEmail: string | null | undefined
  platformRows: AdultPartnerPlatformRow[]
  toDisconnect: FocusAlignPlatform[]
  notification: { title: string; description: string }
}): Promise<boolean> {
  const { supabase, userId, userEmail, platformRows, toDisconnect, notification } = params
  if (toDisconnect.length === 0) return false

  const rowByPlatform = new Map<string, AdultPartnerPlatformRow>()
  for (const r of platformRows) {
    rowByPlatform.set(String(r.platform).toLowerCase(), r)
  }

  const now = new Date().toISOString()
  let clearedOnlyFansCache = false
  const disconnectedOk: FocusAlignPlatform[] = []

  for (const platform of toDisconnect) {
    const row = rowByPlatform.get(platform)
    if (!row || row.is_connected !== true) continue

    let dbDisconnected = false
    if (platform === 'onlyfans') {
      const apiKey = process.env.ONLYFANS_API_KEY
      const token =
        row.access_token != null && String(row.access_token).trim() !== '' ? String(row.access_token) : null
      if (apiKey && token) {
        try {
          const api = createOnlyFansAPI()
          const deleteResult = await api.deleteAccount(token)
          if (!deleteResult.success) {
            console.warn('[align-adult-platforms] OnlyFans partner delete failed:', deleteResult.message)
          }
        } catch (e) {
          console.warn('[align-adult-platforms] OnlyFans partner delete error:', e)
        }
      }
      const { error } = await supabase
        .from('platform_connections')
        .update({
          is_connected: false,
          access_token: null,
          last_sync_at: now,
          observed_monthly_revenue_usd: null,
          observed_revenue_captured_at: null,
          observed_revenue_onlyfans_account_id: null,
        })
        .eq('user_id', userId)
        .eq('platform', 'onlyfans')
      if (error) {
        console.warn('[align-adult-platforms] OnlyFans DB update failed:', error.message)
        continue
      }
      dbDisconnected = true
      if (!clearedOnlyFansCache) {
        await clearOnlyFansDmMessageCacheForUser(supabase, userId)
        clearedOnlyFansCache = true
      }
    } else if (platform === 'fansly') {
      const { error } = await supabase
        .from('platform_connections')
        .update({
          is_connected: false,
          access_token: null,
          platform_user_id: null,
          last_sync_at: now,
          observed_monthly_revenue_usd: null,
          observed_revenue_captured_at: null,
          observed_revenue_onlyfans_account_id: null,
        })
        .eq('user_id', userId)
        .eq('platform', 'fansly')
      if (error) {
        console.warn('[align-adult-platforms] Fansly DB update failed:', error.message)
        continue
      }
      dbDisconnected = true
    }

    if (dbDisconnected) {
      disconnectedOk.push(platform)
    }
    if (dbDisconnected && userEmail) {
      void notifyPlatformConnectionChange({
        supabase,
        userId,
        userEmail,
        platform,
        event: 'disconnected',
        platformUsername: row.platform_username ?? null,
      })
    }
  }

  if (disconnectedOk.length === 0) return false

  void insertDivineAppNotification(supabase, userId, {
    type: 'system',
    title: notification.title,
    description: notification.description,
    link: '/dashboard/settings?tab=integrations',
    platform: null,
  })
  return true
}

/**
 * Free / lapsed / protection-only: no paid creator seat or active Divine trial — disconnect all linked
 * OnlyFans/Fansly rows (same DB behavior as manual disconnect).
 */
export async function maybeDisconnectUnentitledPartnerPlatforms(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined,
  preloaded: FocusAlignPreloaded,
): Promise<boolean> {
  const { subscription, platformRows } = preloaded
  if (canConnectAdultPartnerPlatform(subscription)) return false

  const toDisconnect: FocusAlignPlatform[] = []
  for (const p of FOCUS_ALIGN_PLATFORMS) {
    const row = platformRows.find((r) => String(r.platform).toLowerCase() === p && r.is_connected === true)
    if (row) toDisconnect.push(p)
  }
  if (toDisconnect.length === 0) return false

  const removedNames = toDisconnect.map((p) => platformLabel(p as AdultBillingPlatform)).join(', ')
  return disconnectListedAdultPlatforms({
    supabase,
    userId,
    userEmail,
    platformRows,
    toDisconnect,
    notification: {
      title: 'Platforms disconnected',
      description: `We disconnected ${removedNames} because only an active paid plan or Divine trial can keep creator accounts linked. Upgrade or start a trial under Billing, then reconnect in Settings → Integrations.`,
    },
  })
}

/**
 * When a paid Focus subscription does not cover a still-connected OnlyFans/Fansly row, disconnect the
 * extra platform(s) so product APIs (Messages, etc.) are not hard-blocked. Notifies in-app (and email
 * when available) similar to manual disconnect.
 *
 * @returns true when at least one platform row was disconnected (caller should refetch connections).
 */
export async function maybeAlignFocusPlatformConnections(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined,
  preloaded: FocusAlignPreloaded,
): Promise<boolean> {
  const { subscription, platformRows } = preloaded

  if (!subscription || !isPaidSubscription(subscription)) return false

  const connections = buildConnectionsFromRows(platformRows ?? [])
  const mismatch = focusConnectedPlatformsMismatch(
    subscription as SubscriptionFocusFields,
    connections,
  )
  if (!mismatch) return false

  const allowed = resolveAllowedFocusPlatforms(
    subscription.billing_focus_platforms,
    subscription.billing_focus_platform,
  )
  const allowedSet = new Set(allowed)
  const connected = connectedAdultPlatforms(connections)
  const toDisconnect = connected.filter((p): p is FocusAlignPlatform =>
    (FOCUS_ALIGN_PLATFORMS as readonly string[]).includes(p) && !allowedSet.has(p),
  )
  if (toDisconnect.length === 0) return false

  const allowedNames = allowed.map(platformLabel).join(' + ')
  const removedNames = toDisconnect.map(platformLabel).join(', ')

  return disconnectListedAdultPlatforms({
    supabase,
    userId,
    userEmail,
    platformRows,
    toDisconnect,
    notification: {
      title: 'Platforms updated for your plan',
      description: `We disconnected ${removedNames} so your workspace matches your Focus subscription (${allowedNames}). If you switch plans later, platforms not included on the new plan may be disconnected automatically—you can reconnect allowed platforms anytime in Settings.`,
    },
  })
}
