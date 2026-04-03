import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError, withDefaultAccountIds } from '@/lib/onlyfans-api-route'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const body = withDefaultAccountIds(await request.json().catch(() => ({})), gate.ctx.accountId) as Record<
      string,
      unknown
    >
    // Partner global API requires an explicit forecast metric (e.g. revenue projection).
    if (body.forecast_metric == null && body.metric == null) {
      body.forecast_metric = 'revenue'
    }
    if (body.horizon_months == null) body.horizon_months = 3
    const data = await gate.ctx.api.analyticsRevenueForecast(body)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
