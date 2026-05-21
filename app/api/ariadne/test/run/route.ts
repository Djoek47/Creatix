import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { isAriadneAttributionTestApiEnabled } from '@/lib/ariadne/feature-flags'
import { runAttributionTestSuite } from '@/lib/ariadne/attribution-test-harness'

export const runtime = 'nodejs'

/**
 * POST — runs the in-process MarkIt attribution test harness (append-v1 + microdot roundtrips).
 * Gated by `ARIADNE_ATTRIBUTION_TEST_API=true`. Does not charge credits.
 */
export async function POST(request: NextRequest) {
  if (!isAriadneAttributionTestApiEnabled()) {
    return NextResponse.json(
      { error: 'Set ARIADNE_ATTRIBUTION_TEST_API=1 to enable the harness' },
      { status: 403 },
    )
  }
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = runAttributionTestSuite(user.id)
  return NextResponse.json({ ok: report.failed === 0, report })
}
