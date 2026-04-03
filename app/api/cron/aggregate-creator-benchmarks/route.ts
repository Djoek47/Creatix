import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { computeAndUpsertInternalBenchmarks } from '@/lib/creator-benchmarks/compute-internal-benchmarks'

export const maxDuration = 300

/**
 * Rebuilds anonymized CRM-derived benchmarks for Competitor Analysis.
 * Schedule after fan syncs; safe to run weekly.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const result = await computeAndUpsertInternalBenchmarks(supabase)
  return NextResponse.json(result)
}
