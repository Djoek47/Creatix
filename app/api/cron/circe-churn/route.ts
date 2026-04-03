import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { runCirceChurnForUser, type CirceChurnSettingsRow } from '@/lib/circe-churn/run-for-user'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: rows, error } = await supabase.from('circe_churn_settings').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dryRun = process.env.CHURN_DRY_RUN === 'true'
  const results: Array<{
    userId: string
    ran: boolean
    candidates?: number
    skippedReason?: string
    creditsCharged?: number
    error?: string
  }> = []

  for (const row of rows ?? []) {
    const settings = row as unknown as CirceChurnSettingsRow
    if (!settings.enabled || settings.run_cadence === 'off') continue

    const out = await runCirceChurnForUser(supabase, settings, { dryRun })
    results.push({
      userId: settings.user_id,
      ran: out.ran,
      candidates: out.candidates,
      skippedReason: out.skippedReason,
      creditsCharged: out.creditsCharged,
      error: out.error,
    })
  }

  const ranCount = results.filter((r) => r.ran).length
  return NextResponse.json({ processed: results.length, ran: ranCount, dryRun, results })
}
