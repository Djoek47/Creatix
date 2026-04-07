import { insertDivineAppNotification, type NotificationInsertClient } from '@/lib/notifications/divine-app-notification'
import { getCanonicalUrl } from '@/lib/site-url'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

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
