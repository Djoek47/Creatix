import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runLeakScan } from '@/lib/leaks/run-scan'
import { normalizeDiscoveryHostNeedles } from '@/lib/leaks/discovery-focus'
import { CREDITS_LEAK_SCAN } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'

type ScanBody = {
  urls?: string[]
  aliases?: string[]
  former_usernames?: string[]
  title_hints?: string[]
  /** Default true: include titles from content library (skipped when content_ids set unless explicitly true) */
  include_content_titles?: boolean
  limitPerQuery?: number
  /** Default true: filter search hits (Grok for Pro, keyword match otherwise). Manual URLs are always kept. */
  strict?: boolean
  focus_handles?: string[]
  content_ids?: string[]
  focus_title_hints?: string[]
  focus_hosts?: string[]
  focus_media?: 'video' | 'photo'
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await hasEnoughAiCredits(supabase, user.id, CREDITS_LEAK_SCAN)
  if (!gate.ok) {
    return insufficientAiCreditsResponse(gate.used, gate.limit)
  }

  const body: ScanBody = await req.json().catch(() => ({}))
  if (Array.isArray(body.focus_handles) && body.focus_handles.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Select at least one identity before running Protection scan.' },
      { status: 400 },
    )
  }

  const hosts = normalizeDiscoveryHostNeedles(body.focus_hosts)
  const focalMedia =
    body.focus_media === 'video' || body.focus_media === 'photo' ? body.focus_media : undefined

  const result = await runLeakScan(supabase, {
    userId: user.id,
    urls: body.urls,
    aliases: body.aliases,
    former_usernames: body.former_usernames,
    title_hints: body.title_hints,
    include_content_titles: body.include_content_titles,
    limitPerQuery: body.limitPerQuery,
    strict: body.strict,
    focus_handles: body.focus_handles,
    content_ids: body.content_ids,
    focus_title_hints: body.focus_title_hints,
    focus_hosts: hosts.length ? hosts : undefined,
    focus_media: focalMedia,
  })

  if (!result.success) {
    const status = result.statusCode ?? 500
    return NextResponse.json(
      {
        success: false,
        error: result.message || 'Leak scan failed',
        inserted: result.inserted,
        skipped: result.skipped,
        filteredStrict: result.filteredStrict,
        filteredFocus: result.filteredFocus,
      },
      { status },
    )
  }

  const consumed = await consumeAiCredits(supabase, user.id, CREDITS_LEAK_SCAN, {
    reasonCode: 'leak_scan',
    metadata: { service_display_name: 'Leak Scanner' },
  })
  if (!consumed.ok) {
    return insufficientAiCreditsResponse(consumed.used, consumed.limit)
  }

  return NextResponse.json({
    success: result.success,
    inserted: result.inserted,
    skipped: result.skipped,
    reopened: result.reopened,
    filteredStrict: result.filteredStrict,
    filteredFocus: result.filteredFocus,
    message: result.message,
    providerConfigured: result.providerConfigured,
    grokEnrichment: result.grokEnrichment,
    fetchVerified: result.fetchVerified,
    pageVerifyCount: result.pageVerifyCount,
  })
}
