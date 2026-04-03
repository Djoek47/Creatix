import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'
import { onlyFansPartnerAccountIdFromRow } from '@/lib/platform-partner-account-id'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    const accountId = onlyFansPartnerAccountIdFromRow(connection)
    if (!accountId) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(accountId)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const res = await api.getChatMedia(chatId, { limit, offset })
    const raw = Array.isArray((res as any)?.data?.list)
      ? (res as any).data.list
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
          ? (res as any)
          : []

    const media = raw.map((m: any) => ({
      id: m.id ?? m.mediaId,
      type: m.type ?? m.kind ?? 'photo',
      canView: m.canView ?? m.can_see ?? true,
      price: m.price ?? null,
      isPaid: m.isPaid ?? false,
      files: m.files ?? undefined,
    }))

    return NextResponse.json({ media })
  } catch (error) {
    console.error('[onlyfans/chat-media]', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat media' },
      { status: 500 },
    )
  }
}

