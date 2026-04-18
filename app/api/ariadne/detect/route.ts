import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { extractAppendV1 } from '@/lib/ariadne-embed'
import { parseAriadneRecipientKey } from '@/lib/ariadne-detect-report'

export const runtime = 'nodejs'

const DETECT_MAX_BYTES = 120 * 1024 * 1024

/**
 * POST multipart: file=@video.mp4 — extracts append-v1 marker and returns matching export row (if any).
 */
export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const toolCost = getCreditsForToolId('ariadne-detect')
  const gate = await hasEnoughAiCredits(supabase, user.id, toolCost)
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Insufficient AI credits', code: 'ai_credits_exhausted', used: gate.used, limit: gate.limit },
      { status: 402 },
    )
  }

  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > DETECT_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const extracted = extractAppendV1(buf)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  const service = createServiceClient(url, key)

  if (!extracted) {
    const debit = await consumeAiCredits(supabase, user.id, toolCost)
    if (!debit.ok) {
      return NextResponse.json({ error: 'Credit debit failed' }, { status: 500 })
    }
    return NextResponse.json({
      match: false,
      algorithmVersion: null,
      message: 'No Ariadne append-v1 marker found in this file.',
      creditsCharged: toolCost,
      report: {
        verdict: 'no_marker',
        headline: 'No Ariadne marker detected',
        summary:
          'This file does not contain a Creatix append-v1 forensic marker in the expected format. It may be an unmarked copy, re-encoded without the tail, or not from your workflow.',
      },
    })
  }

  let exp: Record<string, unknown> | null = null
  let expErr: { message?: string } | null = null
  {
    const sel = await service
      .from('ariadne_exports')
      .select(
        'id, content_id, recipient_key, source, algorithm_version, created_at, payload_id, platform, platform_fan_id',
      )
      .eq('user_id', user.id)
      .eq('payload_id', extracted.payloadId)
      .maybeSingle()
    exp = sel.data as Record<string, unknown> | null
    expErr = sel.error
    if (sel.error && /platform_fan_id|column .* does not exist/i.test(sel.error.message || '')) {
      const fb = await service
        .from('ariadne_exports')
        .select('id, content_id, recipient_key, source, algorithm_version, created_at, payload_id')
        .eq('user_id', user.id)
        .eq('payload_id', extracted.payloadId)
        .maybeSingle()
      exp = fb.data as Record<string, unknown> | null
      expErr = fb.error
    }
  }

  const debit = await consumeAiCredits(supabase, user.id, toolCost)
  if (!debit.ok) {
    return NextResponse.json({ error: 'Credit debit failed' }, { status: 500 })
  }

  if (expErr || !exp) {
    return NextResponse.json({
      match: 'unregistered',
      payload: extracted,
      message: 'Marker decoded but no matching export row for your account (wrong account or old export).',
      creditsCharged: toolCost,
      report: {
        verdict: 'unregistered',
        headline: 'Marker not registered to your workspace',
        summary:
          'A valid Ariadne marker was found in the file, but it is not registered to your Creatix account. It may belong to another creator or an old export.',
      },
    })
  }

  const recipientKey = String(exp.recipient_key ?? '')
  const parsed = parseAriadneRecipientKey(recipientKey)
  const contentId = String(exp.content_id ?? '')

  let contentTitle: string | null = null
  if (contentId) {
    const { data: crow } = await service
      .from('content')
      .select('title')
      .eq('id', contentId)
      .eq('user_id', user.id)
      .maybeSingle()
    contentTitle = (crow as { title?: string } | null)?.title ?? null
  }

  let fanHandle: string | null = null
  const fanLookupId =
    (typeof exp.platform_fan_id === 'string' && exp.platform_fan_id) ||
    (parsed.kind === 'onlyfans_fan' ? parsed.fanId : '')
  if (fanLookupId) {
    const { data: fr } = await supabase
      .from('divine_fan_recents')
      .select('username, display_name')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('fan_id', fanLookupId)
      .maybeSingle()
    if (fr) {
      const row = fr as { username?: string | null; display_name?: string | null }
      fanHandle = row.username?.trim() || row.display_name?.trim() || null
    }
  }

  const embeddedAt = String(exp.created_at ?? '')
  const markerExpiresAt =
    typeof extracted.exp === 'number' && Number.isFinite(extracted.exp)
      ? new Date(extracted.exp * 1000).toISOString()
      : null

  return NextResponse.json({
    match: true,
    export: exp,
    payload: extracted,
    creditsCharged: toolCost,
    dmcaHint:
      'Use recipient_key and content_id with Protection / DMCA workflows; cross-reference leak alerts for the same file hash when v2 lands.',
    report: {
      verdict: 'verified_account_match',
      headline: 'Marker verified — matches your Creatix export',
      recipientKey,
      recipientKind: parsed.kind,
      recipientLine: parsed.displayLine,
      onlyFansFanId: parsed.kind === 'onlyfans_fan' ? parsed.fanId : (exp.platform_fan_id as string) || null,
      fanUsernameOrDisplay: fanHandle,
      attributionLine:
        fanHandle && parsed.kind === 'onlyfans_fan'
          ? `@${fanHandle} (OnlyFans id ${parsed.fanId})`
          : fanHandle
            ? `@${fanHandle}`
            : parsed.kind === 'onlyfans_fan'
              ? `OnlyFans fan id ${parsed.fanId ?? exp.platform_fan_id ?? '—'}`
              : recipientKey,
      contentId,
      contentTitle,
      vaultItemLabel: contentTitle || 'Vault item',
      embeddedAt,
      embeddedAtReadable: embeddedAt ? new Date(embeddedAt).toLocaleString() : null,
      markerExpiresAt,
      markerExpiresReadable: markerExpiresAt ? new Date(markerExpiresAt).toLocaleString() : null,
      exportId: String(exp.id ?? ''),
      payloadId: String(exp.payload_id ?? extracted.payloadId ?? ''),
      algorithmVersion: String(exp.algorithm_version ?? 'append-v1'),
      source: String(exp.source ?? ''),
    },
  })
}
