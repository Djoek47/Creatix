import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { assertSafeHttpsUrl, fetchLinkMetadata } from '@/lib/gifts/fetch-link-metadata'

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    if (!isUuid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      title?: string | null
      description?: string | null
      price_amount?: number | null
      price_currency?: string | null
      image_url?: string | null
      url?: string
      refetch?: boolean
      fetch_status?: 'pending' | 'ok' | 'failed'
      fetch_error?: string | null
    }

    const { data: row, error: loadErr } = await supabase
      .from('creator_gift_wishlist_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (loadErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.title === 'string' || body.title === null) patch.title = body.title
    if (typeof body.description === 'string' || body.description === null) patch.description = body.description
    if (typeof body.image_url === 'string' || body.image_url === null) patch.image_url = body.image_url
    if (typeof body.price_currency === 'string' || body.price_currency === null) {
      patch.price_currency = body.price_currency
    }
    if (body.price_amount === null || typeof body.price_amount === 'number') {
      patch.price_amount = body.price_amount
    }

    if (body.fetch_status === 'pending' || body.fetch_status === 'ok' || body.fetch_status === 'failed') {
      patch.fetch_status = body.fetch_status
    }
    if (body.fetch_error === null || typeof body.fetch_error === 'string') {
      patch.fetch_error = body.fetch_error
    }

    if (body.refetch === true) {
      const meta = await fetchLinkMetadata(String(row.url))
      if (meta.ok) {
        patch.title = meta.title ?? row.title
        patch.description = meta.description ?? row.description
        patch.image_url = meta.imageUrl ?? row.image_url
        patch.price_amount = meta.priceAmount ?? row.price_amount
        patch.price_currency = meta.priceCurrency ?? row.price_currency
        patch.fetch_status = 'ok'
        patch.fetch_error = null
      } else {
        patch.fetch_status = 'failed'
        patch.fetch_error = meta.error
      }
      patch.fetched_at = new Date().toISOString()
    }

    if (typeof body.url === 'string' && body.url.trim()) {
      const u = assertSafeHttpsUrl(body.url.trim())
      if (!u) return NextResponse.json({ error: 'Valid HTTPS URL required' }, { status: 400 })
      patch.url = u.toString()
    }

    const { data: updated, error: upErr } = await supabase
      .from('creator_gift_wishlist_items')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
    return NextResponse.json({ item: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    if (!isUuid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('creator_gift_wishlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
