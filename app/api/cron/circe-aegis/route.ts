import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { runCirceAegisForUser, type CirceAegisSettingsRow } from '@/lib/circe-aegis/run-for-user'

export const maxDuration = 300

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: rows, error } = await supabase.from('circe_aegis_settings').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dryRun = process.env.AEGIS_DRY_RUN === 'true'
  const results: Array<{
    userId: string
    ran: boolean
    inserted?: number
    draftsCreated?: number
    skippedReason?: string
    scanError?: string
  }> = []

  for (const row of rows ?? []) {
    const settings = row as unknown as CirceAegisSettingsRow
    if (!settings.enabled || settings.scan_cadence === 'off') continue

    const out = await runCirceAegisForUser(supabase, settings, { dryRun })
    results.push({
      userId: settings.user_id,
      ran: out.ran,
      inserted: out.inserted,
      draftsCreated: out.draftsCreated,
      skippedReason: out.skippedReason,
      scanError: out.scanError,
    })
  }

  const ranCount = results.filter((r) => r.ran).length
  return NextResponse.json({ processed: results.length, ran: ranCount, dryRun, results })
}
