import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveAppVaultQuotaMb } from '@/lib/billing/app-storage-cap'
import {
  resolveVaultUserQuotaBytes,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'

function objectSizeBytes(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const raw = (metadata as { size?: unknown }).size
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Billing-facing vault storage: quota matches Supabase Storage enforcement (see `VAULT_USER_QUOTA_MB`);
 * usage is summed from `storage.objects` for the vault-media bucket (same as upload checks).
 */
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
  const quotaMb = resolveAppVaultQuotaMb()
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

  const trace = {
    kind: 'supabase_storage_vault_media_per_user' as const,
    limited: true,
    /** Whether `VAULT_USER_QUOTA_MB` was set on the server (value is not exposed). */
    quotaSource: process.env.VAULT_USER_QUOTA_MB ? ('environment' as const) : ('product_default' as const),
  }

  return NextResponse.json({
    quotaMb,
    quotaBytes,
    usageBytes,
    usageMb: usageBytes / (1024 * 1024),
    remainingBytes: Math.max(0, quotaBytes - usageBytes),
    usagePercent: quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0,
    trace,
  })
}
