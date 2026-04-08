import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { fetchPageTextExcerpt } from '@/lib/leaks/fetch-verify'
import { verifyLeakPagesWithGrok } from '@/lib/leaks/grok-page-verify'
import { isPaidPlanId } from '@/lib/billing/access'

function safeJsonParseLocal(input: string | null): Record<string, unknown> {
  if (!input) return {}
  try {
    return JSON.parse(input) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * POST — Re-run page excerpt + Grok verification for a single leak (Pro + XAI).
 * Used for critical items without waiting for a full scan.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const planId = (subRow as { plan_id?: string } | null)?.plan_id?.toLowerCase() || null
  if (!planId || !isPaidPlanId(planId)) {
    return NextResponse.json({ error: 'Venus Pro required for page verify' }, { status: 403 })
  }

  const grokKey = process.env.XAI_API_KEY
  if (!grokKey) {
    return NextResponse.json({ error: 'AI verification not configured' }, { status: 503 })
  }

  const { data: row, error } = await supabase
    .from('leak_alerts')
    .select('id, source_url, notes, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  const sourceUrl = (row as { source_url: string }).source_url
  const notes = (row as { notes: string | null }).notes
  const n = safeJsonParseLocal(notes)
  const excerpt = await fetchPageTextExcerpt(sourceUrl)
  if (!excerpt) {
    return NextResponse.json({ error: 'Could not fetch page text (blocked or empty)' }, { status: 422 })
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('former_usernames, leak_search_title_hints')
    .eq('id', user.id)
    .maybeSingle()
  const former = Array.isArray((profileRow as { former_usernames?: string[] })?.former_usernames)
    ? ((profileRow as { former_usernames: string[] }).former_usernames ?? []).filter(Boolean)
    : []
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform_username')
    .eq('user_id', user.id)
    .eq('is_connected', true)
  const handles = [
    ...(connections || [])
      .map((c: { platform_username?: string }) => c.platform_username)
      .filter((u): u is string => typeof u === 'string' && u.length > 0),
    ...former,
  ]

  const { data: contentRows } = await supabase
    .from('content')
    .select('title')
    .eq('user_id', user.id)
    .in('status', ['published', 'scheduled'])
    .order('created_at', { ascending: false })
    .limit(20)
  const titles = (contentRows || [])
    .map((r: { title?: string }) => r.title)
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)

  try {
    const verified = await verifyLeakPagesWithGrok({
      apiKey: grokKey,
      items: [
        {
          url: sourceUrl,
          pageExcerpt: excerpt,
          title: typeof n.title === 'string' ? n.title : undefined,
          snippet: typeof n.snippet === 'string' ? n.snippet : undefined,
        },
      ],
      knownHandles: handles,
      knownTitlesSample: titles,
    })
    const v = verified[0]
    if (!v) {
      return NextResponse.json({ error: 'Verification produced no result' }, { status: 500 })
    }
    const nextNotes = {
      ...n,
      pageVerify: {
        verifiedLikelyMatch: v.verifiedLikelyMatch,
        rationale: v.rationale,
        checkedAt: new Date().toISOString(),
        manual: true,
      },
    }
    await supabase.from('leak_alerts').update({ notes: JSON.stringify(nextNotes) }).eq('id', id)
    return NextResponse.json({ success: true, pageVerify: nextNotes.pageVerify })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Verification failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
