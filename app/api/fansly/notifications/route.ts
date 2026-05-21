import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'
import { stripHtml } from '@/lib/html-utils'

/**
 * Live “notifications” for the header inbox: derived from recent Fansly chats
 * (unread counts + last message preview). ApiFansly may not expose a dedicated
 * notifications feed; this keeps parity with the OnlyFans pull pipeline.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await fanslyBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()

    const accountId = connection?.access_token ?? connection?.platform_user_id
    if (!connection || !accountId) {
      return NextResponse.json({ connected: false, notifications: [], source: 'fansly', derivedFrom: 'chats' })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 40)

    const api = createFanslyAPI(accountId)
    api.setAccountId(accountId)

    const result = await api.getChats({ limit, offset: 0 })
    const chats = Array.isArray(result?.data) ? result.data : []

    const notifications = chats.slice(0, limit).map((chat: Record<string, unknown>) => {
      const userObj = (chat.user ?? {}) as Record<string, unknown>
      const fanId = userObj.id != null ? String(userObj.id) : ''
      const name =
        (typeof userObj.displayName === 'string' && userObj.displayName.trim()) ||
        (typeof userObj.username === 'string' && userObj.username.trim()) ||
        'Fan'
      const unread = typeof chat.unreadCount === 'number' ? chat.unreadCount : 0
      const lastRaw = typeof chat.lastMessage === 'string' ? chat.lastMessage : ''
      const last = stripHtml(lastRaw).trim()
      const title = unread > 0 ? `Fansly · ${unread} unread` : `Fansly · ${name}`
      const text =
        last.length > 0
          ? `${name}: ${last}`.slice(0, 280)
          : unread > 0
            ? `${name} — new messages`
            : `${name}`

      const updatedAt =
        typeof chat.updatedAt === 'string'
          ? chat.updatedAt
          : typeof chat.updatedAt === 'number'
            ? new Date(chat.updatedAt).toISOString()
            : new Date().toISOString()

      return {
        id: `fansly-chat-${String(chat.id ?? '')}`,
        notificationId: String(chat.id ?? ''),
        title,
        text,
        createdAt: updatedAt,
        type: 'chat',
        fanId,
      }
    })

    return NextResponse.json({
      notifications,
      source: 'fansly',
      derivedFrom: 'chats',
    })
  } catch (error) {
    console.error('Fansly notifications error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to fetch Fansly notifications'
    // Upstream List Chats can return 400 for cursor quirks; keep header polling from surfacing 500.
    const upstreamSoft = /bad request|\(400\)/i.test(msg)
    return NextResponse.json(
      {
        ...(upstreamSoft ? {} : { error: msg }),
        notifications: [] as unknown[],
        source: 'fansly' as const,
        derivedFrom: 'chats',
      },
      { status: upstreamSoft ? 200 : 500 },
    )
  }
}
