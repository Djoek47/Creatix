import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'

export const runtime = 'nodejs'

/** Redirect to a time-limited signed URL (private bucket) or external file_url. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row, error } = await supabase
    .from('content')
    .select('file_url, vault_storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const storagePath = (row as { vault_storage_path?: string | null }).vault_storage_path

  if (storagePath && url && key) {
    const service = createServiceClient(url, key)
    const { data: signed, error: sErr } = await service.storage
      .from(VAULT_MEDIA_BUCKET)
      .createSignedUrl(storagePath, 3600)
    if (!sErr && signed?.signedUrl) {
      return NextResponse.redirect(signed.signedUrl)
    }
  }

  if (row.file_url && /^https?:\/\//i.test(row.file_url)) {
    return NextResponse.redirect(row.file_url)
  }

  return NextResponse.json({ error: 'No downloadable file' }, { status: 404 })
}
