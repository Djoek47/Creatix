import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncFanClassifyForUser } from '@/lib/fan-classify/sync-core'
import type { FanClassifyConfig } from '@/lib/divine-manager'

export const maxDuration = 300

/**
 * Sync OnlyFans user lists + Fansly CRM tags from divine_manager_settings.housekeeping_lists (Smart classify).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data: connections, error } = await supabase
    .from('platform_connections')
    .select('user_id, platform, access_token')
    .eq('is_connected', true)
    .in('platform', ['onlyfans', 'fansly'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ofTokenByUser = new Map<string, string>()
  for (const row of connections ?? []) {
    const uid = row.user_id as string
    if (row.platform === 'onlyfans' && row.access_token) {
      ofTokenByUser.set(uid, String(row.access_token))
    }
  }

  const userIds = [...new Set((connections ?? []).map((r) => r.user_id as string))]

  const results: { userId: string; ok: boolean; details?: string[]; error?: string }[] = []

  for (const userId of userIds) {
    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('housekeeping_lists')
      .eq('user_id', userId)
      .maybeSingle()

    const config = (settings?.housekeeping_lists ?? {}) as FanClassifyConfig
    if (!config.enabled) {
      results.push({ userId, ok: true, details: ['skipped: disabled'] })
      continue
    }

    const onlyfansAccessToken = ofTokenByUser.get(userId) ?? null

    try {
      const out = await syncFanClassifyForUser(supabase, userId, config, { onlyfansAccessToken })
      results.push({ userId, ok: out.ok, details: out.details, error: out.error })
    } catch (e) {
      results.push({
        userId,
        ok: false,
        error: e instanceof Error ? e.message : 'sync failed',
      })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
