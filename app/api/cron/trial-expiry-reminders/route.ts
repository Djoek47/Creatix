import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { TRIAL_PLAN_ID } from '@/lib/billing/access'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type SubRow = {
  user_id: string
  trial_ends_at: string
}

/**
 * Hourly: users in the final 24h of a card-required Divine trial get one in-app notification.
 * Requires `trial_expiry_reminder_sent_at` (migration 091).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('user_id,trial_ends_at')
    .eq('plan_id', TRIAL_PLAN_ID)
    .eq('status', 'trialing')
    .not('stripe_subscription_id', 'is', null)
    .is('trial_expiry_reminder_sent_at', null)
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', in24h.toISOString())
    .limit(200)

  if (error) {
    console.warn('[trial-expiry-reminders]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = (rows as SubRow[] | null) ?? []
  let sent = 0

  for (const row of list) {
    const ends = new Date(row.trial_ends_at)
    if (Number.isNaN(ends.getTime())) continue

    await insertDivineAppNotification(supabase, row.user_id, {
      type: 'system',
      title: 'Your trial ends soon',
      description:
        'Your Divine trial ends in about 24 hours. Upgrade or add a credit pack to keep uninterrupted access.',
      link: '/dashboard/settings',
      metadata: { kind: 'trial_expiring_24h', trial_ends_at: row.trial_ends_at },
    })

    const { error: upErr } = await supabase
      .from('subscriptions')
      .update({
        trial_expiry_reminder_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', row.user_id)
      .eq('plan_id', TRIAL_PLAN_ID)
      .is('trial_expiry_reminder_sent_at', null)

    if (!upErr) sent += 1
    else console.warn('[trial-expiry-reminders] update', upErr.message)
  }

  return NextResponse.json({
    ok: true,
    candidates: list.length,
    reminders_marked_sent: sent,
  })
}
