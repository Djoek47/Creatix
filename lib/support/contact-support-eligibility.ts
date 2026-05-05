import { canUseCreditGatedProFeature } from '@/lib/billing/access'
import { createClient } from '@/lib/supabase/server'

export type ContactSupportGate =
  | { state: 'anonymous' }
  | { state: 'needs_subscription'; email: string | null }
  | {
      state: 'eligible'
      email: string
      displayName: string
    }

/**
 * Who may use POST /api/contact: signed-in users with paid or active Divine trial
 * (same bar as Pro credit-gated features).
 */
export async function loadContactSupportContext(): Promise<ContactSupportGate> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { state: 'anonymous' }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, status, trial_ends_at, current_period_end, stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!canUseCreditGatedProFeature(sub)) {
    return { state: 'needs_subscription', email: user.email ?? null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const metaName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : ''
  const displayName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    metaName.trim() ||
    'Member'

  return {
    state: 'eligible',
    email: user.email ?? '',
    displayName,
  }
}
