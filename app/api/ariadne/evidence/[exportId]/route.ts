import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> },
) {
  const { exportId } = await params
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: row, error } = await service
    .from('ariadne_exports')
    .select(
      'id, user_id, content_id, content_title, recipient_key, recipient_fan_id, recipient_platform, recipient_platform_fan_id, recipient_username, recipient_display_name, source, origin_message_id, origin_mass_batch_id, export_path, payload_id, payload_manifest, file_sha256_before, file_sha256_after, algorithm_version, job_id, pipeline_version, encoder_profile, created_at',
    )
    .eq('id', exportId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !row) return NextResponse.json({ error: 'Evidence export not found' }, { status: 404 })

  const { data: events } = await service
    .from('ariadne_detect_events')
    .select('id, match_state, payload_id, file_sha256, file_name, confidence_score, confidence_gate_passed, metadata, created_at')
    .eq('user_id', user.id)
    .eq('export_id', exportId)
    .order('created_at', { ascending: false })
    .limit(100)

  let downloadUrl: string | null = null
  if (row.export_path) {
    const { data: signed } = await service.storage.from(VAULT_MEDIA_BUCKET).createSignedUrl(row.export_path, 60 * 60 * 24 * 7)
    downloadUrl = signed?.signedUrl ?? null
  }

  const packet = {
    export: row,
    hashes: {
      before_sha256: row.file_sha256_before ?? null,
      after_sha256: row.file_sha256_after ?? null,
      payload_manifest_sha256: createHash('sha256')
        .update(JSON.stringify(row.payload_manifest ?? {}))
        .digest('hex'),
    },
    payload_verification: {
      payload_id: row.payload_id,
      algorithm_version: row.algorithm_version,
      evidence_generated_at: new Date().toISOString(),
    },
    detect_history: events ?? [],
    signed_artifact_url: downloadUrl,
  }

  const format = new URL(request.url).searchParams.get('format')
  if (format === 'packet') {
    return NextResponse.json({
      packetFormat: 'ariadne-evidence-json-v1',
      packet,
    })
  }

  return NextResponse.json({ evidence: packet })
}

