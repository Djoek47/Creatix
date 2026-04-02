import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { assertSafeHttpsUrl, fetchLinkMetadata } from '@/lib/gifts/fetch-link-metadata'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('creator_gift_wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST { url } — insert (or return existing) and run metadata fetch.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { url?: string }
    const urlRaw = typeof body.url === 'string' ? body.url.trim() : ''
    const u = assertSafeHttpsUrl(urlRaw)
    if (!u) {
      return NextResponse.json({ error: 'Valid HTTPS URL required' }, { status: 400 })
    }
    const canonical = u.toString()

    const { data: existing } = await supabase
      .from('creator_gift_wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('url', canonical)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ item: existing, existed: true })
    }

    const meta = await fetchLinkMetadata(canonical)
    const now = new Date().toISOString()
    const insertRow = {
      user_id: user.id,
      url: canonical,
      title: meta.ok ? meta.title : null,
      description: meta.ok ? meta.description : null,
      image_url: meta.ok ? meta.imageUrl : null,
      price_amount: meta.ok ? meta.priceAmount : null,
      price_currency: meta.ok ? meta.priceCurrency : null,
      fetch_status: meta.ok ? 'ok' : 'failed',
      fetch_error: meta.ok ? null : meta.error,
      fetched_at: now,
      updated_at: now,
    }

    const { data: row, error } = await supabase
      .from('creator_gift_wishlist_items')
      .insert(insertRow)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: again } = await supabase
          .from('creator_gift_wishlist_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('url', canonical)
          .maybeSingle()
        if (again) return NextResponse.json({ item: again, existed: true })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ item: row, existed: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to add'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
