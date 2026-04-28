import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDivineAppNotification, type NotificationInsertClient } from '@/lib/notifications/divine-app-notification'
import { getCanonicalUrl } from '@/lib/site-url'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Hours between duplicate mismatch alerts per user (in-app + email). Override via env. Default 7 days. */
const DEFAULT_MISMATCH_COOLDOWN_HOURS = 168

async function hasRecentRevenueBandMismatchNotification(
  supabase: SupabaseClient,
  userId: string,
  cooldownHours: number,
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownHours * 3_600_000).toISOString()
  const { data } = await supabase
    .from('notifications')
    .select('metadata')
    .eq('user_id', userId)
    .eq('origin', 'divine_app')
    .gte('created_at', since)
    .limit(80)

  return (data ?? []).some((row) => {
    const m = row.metadata as { kind?: string } | null | undefined
    return m?.kind === 'revenue_band_mismatch'
  })
}

export type TierChangeNotifySupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => PromiseLike<{ data: { email?: string | null } | null }>
      }
    }
  }
}

/**
 * In-app (Divine) + optional Resend email when Stripe metadata updates `revenue_tier`.
 */
export async function notifyRevenueTierChange(
  supabase: TierChangeNotifySupabase,
  params: {
    userId: string
    previousTier: number
    newTier: number
    bandLabel: string | null
    currentPeriodEndIso?: string | null
  },
): Promise<void> {
  const { userId, previousTier, newTier, bandLabel, currentPeriodEndIso } = params
  const band = bandLabel?.trim() || `Band ${newTier}`
  const dir = newTier > previousTier ? 'up' : 'down'
  const title =
    dir === 'up' ? 'Your revenue band moved up' : 'Your revenue band was updated'
  const periodHint =
    currentPeriodEndIso && currentPeriodEndIso.length > 0
      ? ` Current period ends ${new Date(currentPeriodEndIso).toLocaleDateString()}.`
      : ''

  const description = [
    `Your subscription band changed from tier ${previousTier} to tier ${newTier} (${band}).`,
    ' The new monthly price applies on your next invoice (no mid-cycle proration).',
    periodHint,
  ]
    .join('')
    .slice(0, 2000)

  await insertDivineAppNotification(supabase as NotificationInsertClient, userId, {
    type: 'system',
    title,
    description,
    link: '/dashboard/settings?tab=billing',
    metadata: {
      kind: 'billing_tier_change',
      previousTier,
      newTier,
      bandLabel: band,
    },
  })

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL || 'Circe et Venus <support@circe-venus.com>'
  if (!apiKey) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  const to = typeof profile?.email === 'string' ? profile.email.trim() : ''
  if (!to || !to.includes('@')) return

  const text = [
    title,
    '',
    `Previous tier: ${previousTier} → New tier: ${newTier} (${band}).`,
    '',
    'Your next invoice will reflect the updated monthly amount (we do not prorate mid-cycle).',
    '',
    `Manage billing: ${getCanonicalUrl('/dashboard/settings?tab=billing')}`,
  ].join('\n')

  try {
    await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `${title} — Circe et Venus`,
        text,
      }),
    })
  } catch (e) {
    console.warn('[notifyRevenueTierChange] email', e instanceof Error ? e.message : e)
  }
}

/**
 * In-app + optional Resend email when declared tier is below observation-derived minimum (before alignment completes).
 * Deduped via recent `notifications.metadata.kind === 'revenue_band_mismatch'` within cooldown window.
 */
export async function notifyRevenueBandMismatchIfNeeded(
  supabase: SupabaseClient,
  params: {
    userId: string
    subscribedTier: number
    requiredTier: number
    bandLabelRequired: string
  },
): Promise<boolean> {
  const { userId, subscribedTier, requiredTier, bandLabelRequired } = params
  const cooldownHours = Number(
    process.env.REVENUE_BAND_MISMATCH_NOTIFY_COOLDOWN_HOURS ?? String(DEFAULT_MISMATCH_COOLDOWN_HOURS),
  )
  const skipDedupe = !Number.isFinite(cooldownHours) || cooldownHours <= 0

  if (!skipDedupe) {
    const existing = await hasRecentRevenueBandMismatchNotification(supabase, userId, cooldownHours)
    if (existing) return false
  }

  const band = bandLabelRequired.trim() || `Tier ${requiredTier}`
  const title = 'Your revenue band may be too low'
  const description = [
    `Linked OnlyFans/Fansly activity suggests at least ${band} (tier ${requiredTier}); your subscription is at tier ${subscribedTier}.`,
    ' Upgrade in Billing or disconnect platforms that should not set your band.',
    ' Scheduled Stripe alignment usually applies on renewal without mid-cycle proration—use “Charge proration now” in Billing if you need an immediate catch-up.',
  ]
    .join('')
    .slice(0, 2000)

  await insertDivineAppNotification(supabase as NotificationInsertClient, userId, {
    type: 'system',
    title,
    description,
    link: '/dashboard/settings?tab=billing',
    metadata: {
      kind: 'revenue_band_mismatch',
      subscribedTier,
      requiredTier,
      bandLabel: band,
    },
  })

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL || 'Circe et Venus <support@circe-venus.com>'
  if (!apiKey) return true

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  const to = typeof profile?.email === 'string' ? profile.email.trim() : ''
  if (!to || !to.includes('@')) return true

  const text = [
    title,
    '',
    `Observation implies tier ${requiredTier} (${band}); subscription tier ${subscribedTier}.`,
    '',
    'Open Billing to upgrade, use immediate proration if offered, or disconnect linked platforms.',
    '',
    getCanonicalUrl('/dashboard/settings?tab=billing'),
  ].join('\n')

  try {
    await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `${title} — Circe et Venus`,
        text,
      }),
    })
  } catch (e) {
    console.warn('[notifyRevenueBandMismatchIfNeeded] email', e instanceof Error ? e.message : e)
  }

  return true
}
