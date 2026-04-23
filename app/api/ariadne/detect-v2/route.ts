import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runDetectV2 } from '@/lib/ariadne/detect-v2'
import { isAriadneConfidenceGatingEnabled, isAriadneV2DetectEnabled } from '@/lib/ariadne/feature-flags'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!isAriadneV2DetectEnabled()) {
    return NextResponse.json({ error: 'ARIADNE_V2_DETECT_ENABLED is disabled' }, { status: 403 })
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const buf = Buffer.from(await file.arrayBuffer())
  const detect = runDetectV2(buf)
  const candidateIds = detect.payload_candidates.map((c) => c.payload_id)
  let matchedExportIds: string[] = []
  if (candidateIds.length) {
    const { data } = await supabase
      .from('ariadne_exports')
      .select('id,payload_id')
      .eq('user_id', user.id)
      .in('payload_id', candidateIds)
    matchedExportIds = (data ?? []).map((r) => r.id)
    if (matchedExportIds.length) {
      detect.match_state = 'registered'
      detect.confidence = Math.max(detect.confidence, 0.9)
    } else if (detect.match_state === 'registered') {
      detect.match_state = 'candidate'
    }
  }
  const threshold = 0.85
  const confidence_gate_passed = !isAriadneConfidenceGatingEnabled() || detect.confidence >= threshold

  return NextResponse.json({
    ...detect,
    matched_export_ids: matchedExportIds,
    confidence_gate_passed,
    confidence_threshold: threshold,
  })
}

