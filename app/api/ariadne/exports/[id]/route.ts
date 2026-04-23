import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
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

  const { data: row, error } = await supabase
    .from('ariadne_exports')
    .select(
      'id, user_id, content_id, content_title, recipient_key, recipient_fan_id, recipient_platform, recipient_platform_fan_id, recipient_username, recipient_display_name, source, origin_message_id, origin_mass_batch_id, export_path, payload_id, payload_manifest, file_sha256_before, file_sha256_after, algorithm_version, job_id, pipeline_version, encoder_profile, created_at',
    )
    .eq('id', id)
    .eq('user_id', user.id)
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
