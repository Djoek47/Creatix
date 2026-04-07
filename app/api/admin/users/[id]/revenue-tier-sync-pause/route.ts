import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin-api'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Admin: pause automatic Stripe tier alignment (cron) for a user until `pausedUntil`, or clear when null.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi()
  if (gate instanceof NextResponse) return gate
  const { id } = await ctx.params
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('revenue_tier_sync_paused_until')
    .eq('user_id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    revenue_tier_sync_paused_until: (data as { revenue_tier_sync_paused_until?: string | null } | null)
      ?.revenue_tier_sync_paused_until ?? null,
  })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi()
  if (gate instanceof NextResponse) return gate
  const { id } = await ctx.params
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let pausedUntil: string | null = null
  if ('pausedUntil' in body && body.pausedUntil === null) {
    pausedUntil = null
  } else if (typeof body.pausedUntil === 'string') {
    const t = Date.parse(body.pausedUntil)
    if (!Number.isFinite(t)) {
      return NextResponse.json({ error: 'pausedUntil must be ISO-8601 or null' }, { status: 400 })
    }
    pausedUntil = new Date(t).toISOString()
  } else {
    return NextResponse.json({ error: 'pausedUntil (ISO string | null) required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('subscriptions')
    .update({
      revenue_tier_sync_paused_until: pausedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, revenue_tier_sync_paused_until: pausedUntil })
}
