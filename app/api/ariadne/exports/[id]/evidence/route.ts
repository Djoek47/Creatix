import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
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
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !row) return NextResponse.json({ error: 'Trace export not found' }, { status: 404 })

  const { data: events } = await service
    .from('ariadne_detect_events')
    .select('id, match_state, payload_id, file_sha256, file_name, confidence_score, confidence_gate_passed, metadata, created_at')
    .eq('user_id', user.id)
    .eq('export_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  let downloadUrl: string | null = null
  if (row.export_path) {
    const signedSeconds = 60 * 60 * 24 * 7
    const { data: signed } = await service.storage
      .from(VAULT_MEDIA_BUCKET)
      .createSignedUrl(row.export_path, signedSeconds)
    downloadUrl = signed?.signedUrl ?? null
  }

  return NextResponse.json({
    evidence: {
      export: row,
      detectionEvents: events ?? [],
      immutableHashes: {
        beforeSha256: row.file_sha256_before ?? null,
        afterSha256: row.file_sha256_after ?? null,
        payloadManifestHash: createHash('sha256')
          .update(JSON.stringify(row.payload_manifest ?? {}))
          .digest('hex'),
      },
      downloadUrl,
    },
  })
}

