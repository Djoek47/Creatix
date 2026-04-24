import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError, withDefaultAccountIds } from '@/lib/onlyfans-api-route'
import { normalizeAnalyticsComparisonBody } from '@/lib/onlyfans-analytics-payload'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const body = normalizeAnalyticsComparisonBody(withDefaultAccountIds(raw, gate.ctx.accountId))
    const data = await gate.ctx.api.analyticsPeriodComparison(body)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
