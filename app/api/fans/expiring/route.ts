/**
 * GET /api/fans/expiring?days=14
 * Active CRM fans whose current subscription period ends within the next `days` (from sync).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { normalizeFanFromRow } from '@/lib/fans/normalize-fan-row'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const daysRaw = request.nextUrl.searchParams.get('days')
    const days = Math.min(90, Math.max(1, parseInt(daysRaw || '14', 10) || 14))
    const now = new Date()
    const until = new Date(now)
    until.setUTCDate(until.getUTCDate() + days)

    const { data: rows, error } = await supabase
      .from('fans')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .not('subscription_expires_at', 'is', null)
      .gte('subscription_expires_at', now.toISOString())
      .lte('subscription_expires_at', until.toISOString())
      .order('subscription_expires_at', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const fans = (rows || []).map((row) => normalizeFanFromRow(row as Record<string, unknown>))
    return NextResponse.json({ fans, total: fans.length, days })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load expiring fans'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
