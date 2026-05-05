import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  maybeAlignFocusPlatformConnections,
  maybeDisconnectUnentitledPartnerPlatforms,
} from '@/lib/billing/align-focus-platform-connections'
import { ADULT_PLATFORM_CONNECTION_ROWS_SELECT } from '@/lib/billing/onlyfans-billing-gate'

const SUBSCRIPTION_ALIGN_SELECT =
  'plan_id,status,revenue_tier,billing_variant,billing_focus_platform,billing_focus_platforms'

/**
 * Applies the same OnlyFans/Fansly disconnect + Focus alignment as {@link loadAdultPlatformBillingContext},
 * using whatever subscription row is already in the DB. For Stripe webhooks (service role) so cleanup runs
 * immediately after `subscriptions` upsert — including free / lapsed seats and Focus mismatches.
 */
export async function runAdultPartnerPlatformAlignmentForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined,
): Promise<void> {
  const [{ data: subscription }, { data: platRowsInitial }] = await Promise.all([
    supabase.from('subscriptions').select(SUBSCRIPTION_ALIGN_SELECT).eq('user_id', userId).maybeSingle(),
    supabase
      .from('platform_connections')
      .select(ADULT_PLATFORM_CONNECTION_ROWS_SELECT)
      .eq('user_id', userId)
      .in('platform', ['onlyfans', 'fansly']),
  ])

  let platRows = platRowsInitial ?? []

  const unentitledDisconnected = await maybeDisconnectUnentitledPartnerPlatforms(
    supabase,
    userId,
    userEmail,
    { subscription, platformRows: platRows },
  )
  if (unentitledDisconnected) {
    const { data: platRefetch } = await supabase
      .from('platform_connections')
      .select(ADULT_PLATFORM_CONNECTION_ROWS_SELECT)
      .eq('user_id', userId)
      .in('platform', ['onlyfans', 'fansly'])
    platRows = platRefetch ?? []
  }

  await maybeAlignFocusPlatformConnections(supabase, userId, userEmail, {
    subscription,
    platformRows: platRows,
  })
}

/** Best-effort email for Resend disconnect notifications when only `user_id` is known (e.g. Stripe webhook). */
export async function fetchAuthUserEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data.user?.email?.trim()) return null
    return data.user.email.trim()
  } catch {
    return null
  }
}
