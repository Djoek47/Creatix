import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .single()

    if (!connection?.access_token) {
      return NextResponse.json({ conversations: [], total: 0 })
    }

    const api = createFanslyAPI(connection.access_token)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
    const cursor = searchParams.get('cursor')?.trim() || undefined

    // Vendor List Chats: one GET per request, cursor only on the wire (`limit` is client-side cap).
    const result = await api.getChats({
      singlePage: true,
      ...(cursor ? { cursor } : {}),
      limit,
    })
    const chats = result.data || []

    const conversations = chats.map((chat: any) => ({
      platform: 'fansly' as const,
      chatId: chat.id,
      user: {
        id: chat.user?.id,
        username: chat.user?.username,
        name: chat.user?.displayName || chat.user?.username,
        avatar: chat.user?.avatar,
      },
      lastMessage: {
        text: chat.lastMessage,
        createdAt: chat.updatedAt,
      },
      unreadCount: chat.unreadCount ?? 0,
    }))

    return NextResponse.json({
      conversations,
      total: result.total ?? conversations.length,
      ...(result.nextCursor != null && result.nextCursor !== ''
        ? { nextCursor: result.nextCursor }
        : {}),
      ...(typeof result.hasMore === 'boolean' ? { hasMore: result.hasMore } : {}),
    })
  } catch (error) {
    console.error('Fansly conversations error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
