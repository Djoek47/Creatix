import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin-api'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi()
  if (gate instanceof NextResponse) return gate
  const { id } = await ctx.params
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('user_usage_webhook_endpoints')
    .select('url, enabled, created_at, updated_at')
    .eq('user_id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ endpoint: data ?? null })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminApi()
  if (gate instanceof NextResponse) return gate
  const { id } = await ctx.params
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const urlRaw = typeof body.url === 'string' ? body.url.trim() : ''
  const enabled = body.enabled !== false

  if (!urlRaw) {
    const { error } = await supabase.from('user_usage_webhook_endpoints').delete().eq('user_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, endpoint: null })
  }

  try {
    const u = new URL(urlRaw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return NextResponse.json({ error: 'URL must be http(s)' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('user_usage_webhook_endpoints')
    .select('secret')
    .eq('user_id', id)
    .maybeSingle()
  const prevSecret = (existing as { secret?: string | null } | null)?.secret ?? null

  let secret: string | null = prevSecret
  if (body.clearSecret === true) {
    secret = null
  } else if (typeof body.secret === 'string' && body.secret.length > 0) {
    secret = body.secret
  }

  const row = {
    user_id: id,
    url: urlRaw,
    enabled,
    secret,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('user_usage_webhook_endpoints').upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: out } = await supabase
    .from('user_usage_webhook_endpoints')
    .select('url, enabled, created_at, updated_at')
    .eq('user_id', id)
    .maybeSingle()

  return NextResponse.json({ ok: true, endpoint: out ?? null })
}
