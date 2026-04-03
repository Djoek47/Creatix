import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError, withDefaultAccountIds } from '@/lib/onlyfans-api-route'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const raw = await request.json().catch(() => ({}))
    const body = withDefaultAccountIds(raw, gate.ctx.accountId) as {
      account_ids: string[]
      time_range?: '3m' | '6m' | '12m' | 'ytd' | 'last-year'
    }
    if (!body.time_range) body.time_range = '3m'
    const data = await gate.ctx.api.analyticsHistoricalPerformance(body)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
