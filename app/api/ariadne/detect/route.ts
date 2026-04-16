import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { extractAppendV1 } from '@/lib/ariadne-embed'

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
    })
  }

  const { data: exp, error: expErr } = await service
    .from('ariadne_exports')
    .select('id, content_id, recipient_key, source, algorithm_version, created_at, payload_id')
    .eq('user_id', user.id)
    .eq('payload_id', extracted.payloadId)
    .maybeSingle()

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
    })
  }

  return NextResponse.json({
    match: true,
    export: exp,
    payload: extracted,
    creditsCharged: toolCost,
    dmcaHint:
      'Use recipient_key and content_id with Protection / DMCA workflows; cross-reference leak alerts for the same file hash when v2 lands.',
  })
}
