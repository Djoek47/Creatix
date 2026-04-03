import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { deleteOnlyFansDmCacheMessage } from '@/lib/messages/of-dm-cache'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

/**
 * Permanently remove one cached DM row from Creatix (OnlyFans mirror in Supabase).
 * Does not call OnlyFans — local history only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fanId: string; messageId: string }> },
) {
  const supabase = await createRouteHandlerClient(_request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const billingBlock = await onlyFansBillingGateResponse(supabase)
  if (billingBlock) return billingBlock

  const { fanId, messageId } = await params
  const fid = String(fanId ?? '').trim()
  const mid = String(messageId ?? '').trim()
  if (!fid || !mid) {
    return NextResponse.json({ error: 'Invalid fan or message id' }, { status: 400 })
  }

  const result = await deleteOnlyFansDmCacheMessage(supabase, user.id, fid, mid)
  if (!result.ok) {
    if (result.error === 'not_found') {
      return NextResponse.json({ error: 'Cached message not found' }, { status: 404 })
    }
    console.error('[of-dm-cache] delete:', result.error)
    return NextResponse.json({ error: 'Failed to remove cached message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
