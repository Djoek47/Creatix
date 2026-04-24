import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { consumeAiCredits, hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { enrichAttributionWithExport } from '@/lib/ariadne/attribution-analyze'
import { progressiveMarkitAttributionFromBuffer } from '@/lib/ariadne/progressive-leak-scan'
import { fetchBinaryWithSizeCap } from '@/lib/leaks/safe-leak-url-fetch'
import { normalizeUrl } from '@/lib/leaks/url-utils'
export const runtime = 'nodejs'

const MAX_BYTES = 120 * 1024 * 1024
const toolId = 'ariadne-detect' as const

function leakUrlsEquivalent(a: string, b: string): boolean {
  const na = normalizeUrl(a)
  const nb = normalizeUrl(b)
  if (na && nb) return na === nb
  return a.trim() === b.trim()
}

const CLIENT_IDEM_MAX = 200

type PostBody = { reScan?: boolean; forceNewCharge?: boolean }

async function readAttributionPostBody(request: NextRequest): Promise<PostBody> {
  const ct = request.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return {}
  try {
    const raw = (await request.json()) as unknown
    if (!raw || typeof raw !== 'object') return {}
    const o = raw as Record<string, unknown>
    return {
      reScan: o.reScan === true,
      forceNewCharge: o.forceNewCharge === true,
    }
  } catch {
    return {}
  }
}

/**
 * Wallet idempotency for leak attribution (see `docs/ariadne-leak-attribution.md`):
 * - `Idempotency-Key` / `X-Idempotency-Key`: one debit per (user, alert, key); reuse on retry = no double charge.
 * - `reScan` or `forceNewCharge` in JSON: each request gets a new server nonce → paid re-run without a client key.
 * - Neither: `leak_attribution:{userId}:{alertId}` — at most one debit per alert (legacy / anonymous clients).
 */
function computeLeakAttributionIdempotencyKey(
  userId: string,
  alertId: string,
  request: NextRequest,
  post: PostBody,
): string {
  const raw =
    request.headers.get('idempotency-key')?.trim() || request.headers.get('x-idempotency-key')?.trim()
  if (raw) {
    const part = raw.slice(0, CLIENT_IDEM_MAX)
    return `leak_attribution:${userId}:${alertId}:client:${part}`
  }
  if (post.reScan || post.forceNewCharge) {
    return `leak_attribution:${userId}:${alertId}:rescan:${randomUUID()}`
  }
  return `leak_attribution:${userId}:${alertId}`
}

/**
 * POST — download the leak alert's `source_url` (scoped, SSRF-guarded) and run progressive
 * Ariadne / Markit attribution (append-v1 tail + optional ffmpeg frames + heuristic fallback).
 */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: alertId } = await ctx.params
  const supabase = await createRouteHandlerClient(_request)
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

  const { data: row, error } = await supabase
    .from('leak_alerts')
    .select('id, user_id, source_url')
    .eq('id', alertId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row?.source_url) {
    return NextResponse.json({ error: 'Leak alert not found' }, { status: 404 })
  }

  const postBody = await readAttributionPostBody(_request)
  const idempotencyKey = computeLeakAttributionIdempotencyKey(user.id, alertId, _request, postBody)

  const sourceUrl = row.source_url.trim()
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ error: 'Leak URL is not fetchable' }, { status: 400 })
  }

  let buffer: Buffer
  let usedRangeTail: boolean
  let finalUrl: string
  try {
    const r = await fetchBinaryWithSizeCap(sourceUrl, MAX_BYTES, 8 * 1024 * 1024)
    buffer = r.buffer
    usedRangeTail = r.usedRangeTail
    finalUrl = r.finalUrl
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to download leak URL' },
      { status: 502 },
    )
  }

  if (!leakUrlsEquivalent(finalUrl, sourceUrl)) {
    return NextResponse.json(
      { error: 'Download redirected to a URL that does not match this leak alert after normalization' },
      { status: 409 },
    )
  }

  const progressive = await progressiveMarkitAttributionFromBuffer(buffer)
  const { scan_stages, ...resultRest } = progressive as typeof progressive & { scan_stages: string[] }
  let out = {
    ...resultRest,
    evidence: {
      ...resultRest.evidence,
      progressive: {
        ...resultRest.evidence.progressive,
        used_tail_range_fetch: usedRangeTail,
        scan_stages: scan_stages,
      },
    },
  }
  if (out.watermark_id) {
    const { data: exp } = await supabase
      .from('ariadne_exports')
      .select('id, content_id, source, created_at, user_id')
      .eq('user_id', user.id)
      .eq('payload_id', out.watermark_id)
      .maybeSingle()
    if (exp?.user_id === user.id) {
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
    reasonCode: 'leak_attribution',
    reasonRef: idempotencyKey,
    idempotencyKey,    metadata: {
      tool: toolId,
      leak_alert_id: alertId,
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
    leak_alert_id: alertId,
    fetched_url: finalUrl,
  })
}
