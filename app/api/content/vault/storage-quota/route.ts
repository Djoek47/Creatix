import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  DEFAULT_VAULT_USER_QUOTA_MB,
  resolveVaultUserQuotaBytes,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'

function objectSizeBytes(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const raw = (metadata as { size?: unknown }).size
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export async function GET(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

  const service = createServiceClient(url, key)
  const quotaBytes = resolveVaultUserQuotaBytes()

  const { data: objects, error } = await service
    .schema('storage')
    .from('objects')
    .select('name,metadata')
    .eq('bucket_id', VAULT_MEDIA_BUCKET)
    .like('name', `${user.id}/%`)

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not load storage usage' }, { status: 500 })
  }

  let usageBytes = 0
  for (const row of (objects ?? []) as Array<{ metadata?: unknown }>) {
    usageBytes += objectSizeBytes(row.metadata)
  }

  return NextResponse.json({
    usageBytes,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - usageBytes),
    usagePercent: quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0,
    recommendedPerUserMb: DEFAULT_VAULT_USER_QUOTA_MB,
  })
}
