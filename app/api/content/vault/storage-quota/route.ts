import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  resolveVaultUserQuotaBytes,
  VAULT_MEDIA_BUCKET,
} from '@/lib/frame-vault-media'
import { resolveAppVaultQuotaMb } from '@/lib/billing/app-storage-cap'
import { sumVaultMediaUsageBytes } from '@/lib/vault-storage-usage'

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

  const { bytes: usageBytes, error } = await sumVaultMediaUsageBytes(service, user.id)

  if (error) {
    return NextResponse.json({ error: error || `Could not load storage usage (${VAULT_MEDIA_BUCKET})` }, { status: 500 })
  }

  return NextResponse.json({
    usageBytes,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - usageBytes),
    usagePercent: quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100)) : 0,
    recommendedPerUserMb: resolveAppVaultQuotaMb(),
  })
}
