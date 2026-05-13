import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  getServiceActorUserId,
  parseServiceHeaders,
  sha256Hex,
  verifyServiceSignature,
} from '@/lib/ariadne/service-auth'
import { runDetectV2FromMedia } from '@/lib/ariadne/detect-v2'

export const runtime = 'nodejs'
export const maxDuration = 120

function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.clone().arrayBuffer())
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return json({ error: 'Missing file' }, 400)

  const buf = Buffer.from(await file.arrayBuffer())
  const parsedHeaders = parseServiceHeaders(request)
  if (!parsedHeaders.ok) return json({ error: parsedHeaders.error }, parsedHeaders.status)
  const verified = verifyServiceSignature({
    request,
    headers: parsedHeaders.headers,
    bodySha256: sha256Hex(rawBody),
  })
  if (!verified.ok) return json({ error: verified.error }, verified.status)
  const actorUserId = getServiceActorUserId(parsedHeaders.headers)
  if (!actorUserId) return json({ error: 'x-creatix-actor-user-id is required' }, 400)

  const detect = await runDetectV2FromMedia(buf)
  const candidateIds = detect.payload_candidates.map((c) => c.payload_id)
  let matchedExportIds: string[] = []
  if (candidateIds.length) {
    const supabase = getServiceSupabase()
    const { data } = await supabase
      .from('ariadne_exports')
      .select('id,payload_id')
      .eq('user_id', actorUserId)
      .in('payload_id', candidateIds)
    matchedExportIds = (data ?? []).map((r) => r.id as string)
    if (matchedExportIds.length) {
      detect.match_state = 'registered'
      detect.confidence = Math.max(detect.confidence, 0.9)
    } else if (detect.match_state === 'registered') {
      detect.match_state = 'candidate'
    }
  }

  const threshold = 0.85
  return json({
    ...detect,
    matched_export_ids: matchedExportIds,
    confidence_gate_passed: detect.confidence >= threshold,
    confidence_threshold: threshold,
  })
}
