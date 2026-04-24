import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { consumeAiCredits, hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { analyzeMarkitAttribution, enrichAttributionWithExport } from '@/lib/ariadne/attribution-analyze'

export const runtime = 'nodejs'

const MAX_BYTES = 120 * 1024 * 1024
const toolId = 'ariadne-detect' as const

/**
 * POST multipart: file=… — dual-layer MarkIt / Ariadne attribution for DMCA & leak response.
 * Combines in-band append-v1 (“metadata”) with microdot / buffer heuristics (“visual” path in detect-v2).
 */
export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const toolCost = getCreditsForToolId(toolId)
  const gate = await hasEnoughAiCredits(supabase, user.id, toolCost)
  if (!gate.ok) {
    return insufficientAiCreditsResponse(gate.used, gate.limit)
  }

  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const includeExport = form.get('includeExport') === '1' || form.get('includeExport') === 'true'

  const base = analyzeMarkitAttribution(buf)
  let out = { ...base, evidence: { ...base.evidence } as typeof base.evidence }

  if (includeExport && out.watermark_id) {
    const { data: exp } = await supabase
      .from('ariadne_exports')
      .select('id, content_id, source, created_at, user_id')
      .eq('user_id', user.id)
      .eq('payload_id', out.watermark_id)
      .maybeSingle()
    if (exp && exp.user_id === user.id) {
      out = enrichAttributionWithExport(out, {
        id: exp.id,
        content_id: exp.content_id,
        source: exp.source,
        created_at: exp.created_at,
      })
    } else {
      out = enrichAttributionWithExport(out, null)
    }
  }

  const consumed = await consumeAiCredits(supabase, user.id, toolCost, {
    reasonCode: 'markit_attribution_analyze',
    reasonRef: `attribution_analyze:${user.id}:${out.watermark_id ?? 'none'}`,
    idempotencyKey: `attribution_analyze:${user.id}:${out.watermark_id ?? 'none'}:${buf.length}`,
    metadata: {
      tool: toolId,
      detection_method: out.detection_method,
      is_markit: out.is_markit,
    },
  })
  if (!consumed.ok) {
    return NextResponse.json({ error: 'Credit debit failed' }, { status: 500 })
  }

  return NextResponse.json({
    ...out,
    creditsCharged: toolCost,
  })
}
