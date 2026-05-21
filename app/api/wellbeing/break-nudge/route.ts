import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'

/** Minimum gap between break nudges once the client has already passed the 4h15 visible streak. */
const DEDUPE_MS = 85 * 60 * 1000
const METADATA_KIND = 'wellbeing_break_nudge'

/**
 * Creates a gentle in-app (Divine tab) reminder to take a short break.
 * The client only calls this after ~4h15 of uninterrupted visible-tab time; server dedupes recent rows.
 */
export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - DEDUPE_MS).toISOString()
  const { data: recent, error: qErr } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('origin', 'divine_app')
    .gte('created_at', since)
    .contains('metadata', { kind: METADATA_KIND })
    .limit(1)

  if (qErr) {
    console.warn('[wellbeing/break-nudge]', qErr.message)
    return NextResponse.json({ error: 'Could not check reminders' }, { status: 500 })
  }

  if (recent?.length) {
    return NextResponse.json({ inserted: false, reason: 'recent_exists' })
  }

  await insertDivineAppNotification(supabase, user.id, {
    type: 'cosmic',
    title: 'Time for a short break',
    description:
      'Step away, stretch, or breathe for a minute—you are in a marathon, not a sprint. Open Well-being when you want a longer pause.',
    link: '/dashboard/well-being',
    metadata: { kind: METADATA_KIND },
  })

  return NextResponse.json({ inserted: true })
}
