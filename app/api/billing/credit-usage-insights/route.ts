import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

type TimelineRow = {
  id: string
  kind: 'debit' | 'credit' | 'expire_adjustment'
  amount: number
  reason_code: string
  created_at: string
  metadata?: Record<string, unknown> | null
}

export type CreditUsageInsightsPeriodMode = 'week' | 'month'

/** Rolling window boundaries (UTC) for dashboards. Week = trailing 7 days; month = calendar MTD */
function resolvePeriodRange(mode: CreditUsageInsightsPeriodMode): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  if (mode === 'week') {
    start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(23, 59, 59, 999)
  }
  return { start, end }
}

/** Top debit reasons + ledger rows for Settings → Spend intelligence — optional ?period=week|month */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = req.nextUrl.searchParams.get('period')
    const mode: CreditUsageInsightsPeriodMode = raw === 'week' ? 'week' : 'month'
    const { start, end } = resolvePeriodRange(mode)
    const startIso = start.toISOString()

    const [recentRes, debitRes] = await Promise.all([
      supabase
        .from('credit_transactions')
        .select('id,kind,amount,reason_code,created_at,metadata')
        .eq('user_id', user.id)
        .gte('created_at', startIso)
        .order('created_at', { ascending: false })
        .limit(mode === 'week' ? 50 : 80),
      supabase
        .from('credit_transactions')
        .select('reason_code,amount,created_at')
        .eq('user_id', user.id)
        .eq('kind', 'debit')
        .gte('created_at', startIso)
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    const recentRaw = recentRes.data ?? []
    const recent: TimelineRow[] = recentRaw.map((r) => ({
      id: r.id as string,
      kind: r.kind as TimelineRow['kind'],
      amount: Number(r.amount),
      reason_code: String(r.reason_code),
      created_at: String(r.created_at),
      metadata:
        r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : null,
    }))

    const debits = debitRes.data ?? []
    const byReason = new Map<string, number>()
    let totalDebitCredits = 0
    for (const row of debits) {
      const code = String(row.reason_code)
      const amt = Number(row.amount)
      totalDebitCredits += amt
      byReason.set(code, (byReason.get(code) ?? 0) + amt)
    }
    const topDebits = [...byReason.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([reason, amount]) => ({
        reasonKey: reason,
        reason: reason.replace(/_/g, ' '),
        amount,
      }))

    return NextResponse.json({
      period: {
        mode,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        totalDebitCredits,
      },
      topDebits,
      recent,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load credit insights' }, { status: 500 })
  }
}
