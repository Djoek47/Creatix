import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'
import {
  getServiceActorUserId,
  isServiceRequest,
  parseServiceHeaders,
  verifyServiceSignature,
} from '@/lib/ariadne/service-auth'
import { registerServiceNonce } from '@/lib/ariadne/service-request-store'
import { isMarkitAriadneServiceModeEnabled } from '@/lib/ariadne/feature-flags'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const serviceRequest = isServiceRequest(request)
  if (serviceRequest && !isMarkitAriadneServiceModeEnabled()) {
    return NextResponse.json(
      { error: 'Markit Ariadne service mode is disabled', code: 'service_mode_disabled' },
      { status: 403 },
    )
  }

  let userId: string | null = null
  if (serviceRequest) {
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
      requestPath: `/api/ariadne/exports/${id}`,
      idempotencyKey: parsed.headers.idempotencyKey,
    })
    if (!nonceStatus.ok) {
      return NextResponse.json({ error: nonceStatus.error }, { status: nonceStatus.status })
    }
    userId = getServiceActorUserId(parsed.headers)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'service_actor_required' },
        { status: 401 },
      )
    }
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!userId && user) userId = user.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: row, error } = await supabase
    .from('ariadne_exports')
    .select(
      'id, user_id, content_id, content_title, recipient_key, recipient_fan_id, recipient_platform, recipient_platform_fan_id, recipient_username, recipient_display_name, source, origin_message_id, origin_mass_batch_id, export_path, payload_id, payload_manifest, file_sha256_before, file_sha256_after, algorithm_version, job_id, pipeline_version, encoder_profile, created_at',
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !row) return NextResponse.json({ error: 'Trace export not found' }, { status: 404 })

  let downloadUrl: string | null = null
  if (row.export_path) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && key) {
      const service = createServiceClient(url, key)
      const signedSeconds = 60 * 60 * 24 * 7
      const { data: signed } = await service.storage
        .from(VAULT_MEDIA_BUCKET)
        .createSignedUrl(row.export_path, signedSeconds)
      downloadUrl = signed?.signedUrl ?? null
    }
  }

  return NextResponse.json({
    export: row,
    downloadUrl,
  })
}
