import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { extractAppendV1, sha256Hex } from '@/lib/ariadne-embed'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  isServiceRequest,
  parseServiceHeaders,
  type ParsedServiceHeaders,
  verifyServiceSignature,
} from '@/lib/ariadne/service-auth'
import {
  getIdempotencyResult,
  registerServiceNonce,
  storeIdempotencyResult,
} from '@/lib/ariadne/service-request-store'
import { isAriadneDetectConfidenceGatingEnabled, isMarkitAriadneServiceModeEnabled } from '@/lib/ariadne/feature-flags'

export const runtime = 'nodejs'

const DETECT_MAX_BYTES = 120 * 1024 * 1024
const endpoint = '/api/ariadne/detect'

function confidenceGatePassed(matchState: 'none' | 'unregistered' | 'registered'): boolean {
  if (!isAriadneDetectConfidenceGatingEnabled()) return true
  return matchState === 'registered'
}

/**
 * POST multipart: file=@video.mp4 — extracts append-v1 marker and returns matching export row (if any).
 */
export async function POST(request: NextRequest) {
  let serviceHeaders: ParsedServiceHeaders | null = null
  const isSvcReq = isServiceRequest(request)
  if (isSvcReq && !isMarkitAriadneServiceModeEnabled()) {
    return NextResponse.json({ error: 'Markit Ariadne service mode is disabled' }, { status: 403 })
  }
  if (isSvcReq) {
    const parsed = parseServiceHeaders(request)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })
    const verified = verifyServiceSignature({
      request,
      headers: parsed.headers,
      bodySha256: '',
    })
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status })
    const nonceStatus = await registerServiceNonce({
      serviceName: parsed.headers.serviceName,
      nonce: parsed.headers.nonce,
      requestPath: endpoint,
      idempotencyKey: parsed.headers.idempotencyKey,
    })
    if (!nonceStatus.ok) return NextResponse.json({ error: nonceStatus.error }, { status: nonceStatus.status })
    const replay = await getIdempotencyResult({
      endpoint,
      idempotencyKey: parsed.headers.idempotencyKey,
      serviceName: parsed.headers.serviceName,
    })
    if (replay) {
      return NextResponse.json(replay.response_body, { status: replay.status_code })
    }
    serviceHeaders = parsed.headers
  }

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
  const contentId = typeof formData.get('contentId') === 'string' ? String(formData.get('contentId')) : null
  const suspectedExportId =
    typeof formData.get('suspectedExportId') === 'string' ? String(formData.get('suspectedExportId')) : null
  if (file.size > DETECT_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const extracted = extractAppendV1(buf)

  const service = createServiceRoleClient()
  const fileSha = sha256Hex(buf)
  const fileName = file.name || null

  const persistDetectEvent = async (input: {
    exportId?: string | null
    payloadId?: string | null
    matchState: 'none' | 'unregistered' | 'registered'
    metadata?: Record<string, unknown>
  }) => {
    await service.from('ariadne_detect_events').insert({
      user_id: user.id,
      export_id: input.exportId ?? null,
      payload_id: input.payloadId ?? null,
      match_state: input.matchState,
      source: 'manual_upload',
      file_sha256: fileSha,
      file_name: fileName,
      confidence_score: input.matchState === 'registered' ? 0.99 : input.matchState === 'unregistered' ? 0.45 : 0.05,
      confidence_gate_passed: confidenceGatePassed(input.matchState),
      metadata: input.metadata ?? {},
    })
  }

  if (!extracted) {
    const debit = await consumeAiCredits(supabase, user.id, toolCost, {
      reasonCode: 'ariadne_detect',
      reasonRef: `ariadne_detect:none:${Date.now()}`,
      metadata: {
        tool: 'ariadne-detect',
        match: false,
      },
    })
    if (!debit.ok) {
      return NextResponse.json({ error: 'Credit debit failed' }, { status: 500 })
    }
    const responseBody = {
      match: false,
      algorithmVersion: null,
      message: 'No Ariadne append-v1 marker found in this file.',
      creditsCharged: toolCost,
    }
    await persistDetectEvent({
      matchState: 'none',
      metadata: {
        tool: 'ariadne-detect',
        content_id: contentId,
        suspected_export_id: suspectedExportId,
      },
    })
    if (serviceHeaders) {
      await storeIdempotencyResult({
        endpoint,
        idempotencyKey: serviceHeaders.idempotencyKey,
        serviceName: serviceHeaders.serviceName,
        userId: user.id,
        statusCode: 200,
        responseBody,
      })
    }
    return NextResponse.json(responseBody)
  }

  const { data: exp, error: expErr } = await service
    .from('ariadne_exports')
    .select(
      'id, content_id, content_title, recipient_key, recipient_fan_id, recipient_platform, recipient_platform_fan_id, recipient_username, recipient_display_name, source, origin_message_id, origin_mass_batch_id, export_path, algorithm_version, created_at, payload_id',
    )
    .eq('user_id', user.id)
    .eq('payload_id', extracted.payloadId)
    .maybeSingle()

  const debit = await consumeAiCredits(supabase, user.id, toolCost, {
    reasonCode: 'ariadne_detect',
    reasonRef: `ariadne_detect:${extracted.payloadId}`,
    idempotencyKey: `ariadne_detect:${user.id}:${extracted.payloadId}`,
    metadata: {
      tool: 'ariadne-detect',
      match: !(expErr || !exp),
      payload_id: extracted.payloadId,
      export_id: exp?.id ?? null,
      content_id: exp?.content_id ?? null,
      recipient_key: exp?.recipient_key ?? null,
    },
  })
  if (!debit.ok) {
    return NextResponse.json({ error: 'Credit debit failed' }, { status: 500 })
  }

  if (expErr || !exp) {
    const responseBody = {
      match: 'unregistered',
      payload: extracted,
      message: 'Marker decoded but no matching export row for your account (wrong account or old export).',
      creditsCharged: toolCost,
    }
    await persistDetectEvent({
      payloadId: extracted.payloadId,
      matchState: 'unregistered',
      metadata: {
        tool: 'ariadne-detect',
        content_id: contentId,
        suspected_export_id: suspectedExportId,
      },
    })
    if (serviceHeaders) {
      await storeIdempotencyResult({
        endpoint,
        idempotencyKey: serviceHeaders.idempotencyKey,
        serviceName: serviceHeaders.serviceName,
        userId: user.id,
        statusCode: 200,
        responseBody,
      })
    }
    return NextResponse.json(responseBody)
  }

  const responseBody = {
    match: true,
    export: exp,
    payload: extracted,
    creditsCharged: toolCost,
    dmcaHint:
      'Use recipient_key and content_id with Protection / DMCA workflows; cross-reference leak alerts for the same file hash when v2 lands.',
  }
  await persistDetectEvent({
    exportId: exp.id,
    payloadId: extracted.payloadId,
    matchState: 'registered',
    metadata: {
      tool: 'ariadne-detect',
      export_id: exp.id,
      content_id: contentId,
      suspected_export_id: suspectedExportId,
    },
  })
  if (serviceHeaders) {
    await storeIdempotencyResult({
      endpoint,
      idempotencyKey: serviceHeaders.idempotencyKey,
      serviceName: serviceHeaders.serviceName,
      userId: user.id,
      statusCode: 200,
      responseBody,
    })
  }
  return NextResponse.json(responseBody)
}
