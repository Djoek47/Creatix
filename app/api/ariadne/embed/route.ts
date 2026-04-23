import { NextRequest, NextResponse } from 'next/server'
import { applyFrameCorsHeaders, frameCorsOptions } from '@/lib/cors-frame'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { verifyExportToken } from '@/lib/frame-vault-bridge'
import { createAriadneTraceExport } from '@/lib/ariadne/create-ariadne-trace-export'
import {
  isServiceRequest,
  parseServiceHeaders,
  type ParsedServiceHeaders,
  sha256Hex,
  verifyServiceSignature,
} from '@/lib/ariadne/service-auth'
import { isMarkitAriadneServiceModeEnabled } from '@/lib/ariadne/feature-flags'
import {
  getIdempotencyResult,
  registerServiceNonce,
  storeIdempotencyResult,
} from '@/lib/ariadne/service-request-store'

export const runtime = 'nodejs'

export function OPTIONS(request: NextRequest) {
  return frameCorsOptions(request)
}

/**
 * POST JSON:
 * {
 *   contentId,
 *   recipientKey?,
 *   source?: 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm',
 *   recipient?: { fanId?, platform?, platformFanId?, username?, displayName? },
 *   origin?: { messageId?, massBatchId? },
 *   updateContentRow?: boolean
 * }
 * Downloads vault video, appends Ariadne append-v1 marker, re-uploads, updates content row.
 */
export async function POST(request: NextRequest) {
  const jc = (data: unknown, status: number) => applyFrameCorsHeaders(request, NextResponse.json(data, { status }))

  const endpoint = '/api/ariadne/embed'
  const serviceRequest = isServiceRequest(request)
  const userIdempotencyKey = request.headers.get('x-idempotency-key')?.trim() || null
  if (serviceRequest && !isMarkitAriadneServiceModeEnabled()) {
    return jc({ error: 'Markit Ariadne service mode is disabled' }, 403)
  }
  let bodyRaw = ''
  let body: {
    contentId?: string
    recipientKey?: string
    source?: 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm'
    recipient?: {
      fanId?: string
      platform?: 'onlyfans' | 'fansly' | 'mym'
      platformFanId?: string
      username?: string
      displayName?: string
    }
    origin?: { messageId?: string; massBatchId?: string }
    lineage?: { jobId?: string; pipelineVersion?: string; encoderProfile?: string }
    updateContentRow?: boolean
  }
  try {
    bodyRaw = await request.text()
    body = JSON.parse(bodyRaw)
  } catch {
    return jc({ error: 'Invalid JSON' }, 400)
  }

  const contentId = typeof body.contentId === 'string' ? body.contentId : ''
  const source =
    body.source === 'frame_export' ||
    body.source === 'message_send' ||
    body.source === 'mass_dm'
      ? body.source
      : 'vault_standalone'
  const derivedRecipientKey =
    (typeof body.recipientKey === 'string' ? body.recipientKey.trim() : '') ||
    body.recipient?.username?.trim() ||
    body.recipient?.platformFanId?.trim() ||
    body.recipient?.fanId?.trim() ||
    ''

  if (!contentId || !derivedRecipientKey) {
    return jc({ error: 'contentId and recipient identity are required' }, 400)
  }

  let serviceHeaders: ParsedServiceHeaders | null = null
  if (serviceRequest) {
    const parsed = parseServiceHeaders(request)
    if (!parsed.ok) return jc({ error: parsed.error }, parsed.status)
    const verified = verifyServiceSignature({
      request,
      headers: parsed.headers,
      bodySha256: sha256Hex(bodyRaw),
    })
    if (!verified.ok) return jc({ error: verified.error }, verified.status)
    const nonceStatus = await registerServiceNonce({
      serviceName: parsed.headers.serviceName,
      nonce: parsed.headers.nonce,
      requestPath: endpoint,
      idempotencyKey: parsed.headers.idempotencyKey,
    })
    if (!nonceStatus.ok) return jc({ error: nonceStatus.error }, nonceStatus.status)
    const replay = await getIdempotencyResult({
      endpoint,
      idempotencyKey: parsed.headers.idempotencyKey,
      serviceName: parsed.headers.serviceName,
    })
    if (replay) {
      return jc(replay.response_body, replay.status_code)
    }
    serviceHeaders = parsed.headers
  } else if (userIdempotencyKey) {
    const replay = await getIdempotencyResult({
      endpoint,
      idempotencyKey: userIdempotencyKey,
      serviceName: 'user',
    })
    if (replay) {
      return jc(replay.response_body, replay.status_code)
    }
  }

  const supabase = await createRouteHandlerClient(request)
  let userId: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const tok = authHeader.slice(7).trim()
    const p = verifyExportToken(tok)
    if (p && p.contentId === contentId) userId = p.userId
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!userId && user) userId = user.id
  if (!userId) {
    return jc({ error: 'Unauthorized' }, 401)
  }

  const out = await createAriadneTraceExport({
    supabase,
    userId,
    contentId,
    recipientKey: derivedRecipientKey,
    source,
    recipient: body.recipient,
    origin: body.origin,
    lineage: body.lineage,
    updateContentRow: source === 'vault_standalone' ? body.updateContentRow !== false : false,
  })
  if (!out.ok) {
    return jc(
      {
        error: out.error,
        ...(out.code ? { code: out.code } : {}),
        ...(typeof out.used === 'number' ? { used: out.used } : {}),
        ...(typeof out.limit === 'number' ? { limit: out.limit } : {}),
      },
      out.status,
    )
  }

  const responseBody = {
    success: true,
    payloadId: out.payloadId,
    exportId: out.exportId,
    algorithmVersion: 'append-v1',
    downloadUrl: out.downloadUrl,
    creditsCharged: out.creditsCharged,
    source: out.source,
    contentId: out.contentId,
    recipientKey: out.recipientKey,
    lineage: out.lineage,
  }

  if (serviceHeaders || userIdempotencyKey) {
    await storeIdempotencyResult({
      endpoint,
      idempotencyKey: serviceHeaders?.idempotencyKey ?? userIdempotencyKey ?? '',
      serviceName: serviceHeaders?.serviceName ?? 'user',
      userId,
      statusCode: 200,
      responseBody,
    })
  }

  return jc(responseBody, 200)
}
