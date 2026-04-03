import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin-api'

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate instanceof NextResponse) return gate

  const days = Math.min(90, Math.max(1, Number.parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30))
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_usage_events')
    .select(
      'created_at,user_id,feature,provider,model,input_tokens,output_tokens,total_tokens,estimated_usd,request_id,success',
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(25_000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    'created_at',
    'user_id',
    'feature',
    'provider',
    'model',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'estimated_usd',
    'request_id',
    'success',
  ]
  const lines = [headers.join(',')]
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>
    lines.push(
      [
        csvEscape(String(r.created_at ?? '')),
        csvEscape(String(r.user_id ?? '')),
        csvEscape(String(r.feature ?? '')),
        csvEscape(String(r.provider ?? '')),
        csvEscape(String(r.model ?? '')),
        csvEscape(String(r.input_tokens ?? '')),
        csvEscape(String(r.output_tokens ?? '')),
        csvEscape(String(r.total_tokens ?? '')),
        csvEscape(String(r.estimated_usd ?? '')),
        csvEscape(String(r.request_id ?? '')),
        csvEscape(String(r.success ?? '')),
      ].join(','),
    )
  }

  const csv = lines.join('\n')
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ai_usage_events_last_${days}d.csv"`,
    },
  })
}
