import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { createFanslyAPI } from '@/lib/fansly-api'
import {
  fetchCrmMapForFanIds,
  fetchChurnSnapshotMapForFanIds,
  matchesInboxSegment,
  matchesSearchQuery,
  matchesTagFilter,
  sortEnrichedInbox,
  type InboxCrmPayload,
  type InboxSegment,
  type InboxSort,
  type InboxPlatformFilter,
} from '@/lib/messages/inbox-crm'
import { clearOnlyFansDmMessageCacheForUser } from '@/lib/messages/of-dm-cache'
import {
  adultPlatformBillingGateWhenEitherConnected,
  ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE,
} from '@/lib/onlyfans-api-route'
import { fanslyPartnerAccountIdFromRow, onlyFansPartnerAccountIdFromRow } from '@/lib/platform-partner-account-id'

export const maxDuration = 60

type RawConv = {
  platform: 'onlyfans' | 'fansly'
  chatId?: string
  user: { id: string; username: string; name: string; avatar: string }
  lastMessage: { id: string; text: string; createdAt: string; isRead: boolean }
  unreadCount: number
  crm?: InboxCrmPayload | null
}

function normalizeOfChat(chat: any): RawConv | null {
  const user = chat?.user || chat?.fan
  if (!user?.id) return null
  const lm = chat?.lastMessage
  const text =
    typeof lm?.text === 'string'
      ? lm.text
      : typeof lm?.message === 'string'
        ? lm.message
        : typeof lm === 'string'
          ? lm
          : ''
  return {
    platform: 'onlyfans',
    chatId: String(chat?.id ?? user.id),
    user: {
      id: String(user.id),
      username: String(user.username ?? ''),
      name: String(user.name ?? user.username ?? ''),
      avatar: String(user.avatar ?? ''),
    },
    lastMessage: {
      id: String(lm?.id ?? ''),
      text,
      createdAt: lm?.createdAt ? String(lm.createdAt) : new Date().toISOString(),
      isRead: Boolean(lm?.isRead ?? true),
    },
    unreadCount: Number(chat?.unreadMessagesCount ?? chat?.unreadCount ?? 0),
  }
}

function normalizeFanslyChat(chat: any): RawConv | null {
  const user = chat?.user
  if (!user?.id) return null
  const lastText = typeof chat?.lastMessage === 'string' ? chat.lastMessage : ''
  return {
    platform: 'fansly',
    chatId: String(chat.id ?? user.id),
    user: {
      id: String(user.id),
      username: String(user.username ?? ''),
      name: String(user.displayName ?? user.username ?? ''),
      avatar: String(user.avatar ?? ''),
    },
    lastMessage: {
      id: '',
      text: lastText,
      createdAt: chat?.updatedAt ? String(chat.updatedAt) : new Date().toISOString(),
      isRead: true,
    },
    unreadCount: Number(chat?.unreadCount ?? 0),
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '40', 10)))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))
    const platform = (searchParams.get('platform') || 'all') as InboxPlatformFilter
    const segment = (searchParams.get('segment') || 'all') as InboxSegment
    const sort = (searchParams.get('sort') || 'recent') as InboxSort
    const tag = searchParams.get('tag')?.trim() || undefined
    const search = searchParams.get('search')?.trim() || undefined
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (platform === 'onlyfans' || platform === 'fansly' || platform === 'all') {
      const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
      if (billingBlock) return billingBlock
    }

    const errors: string[] = []

    async function loadOnlyFans(): Promise<RawConv[]> {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token, platform_user_id')
        .eq('user_id', userId)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .single()

      const ofAccountId = onlyFansPartnerAccountIdFromRow(connection)
      if (!ofAccountId) {
        errors.push('onlyfans_disconnected')
        return []
      }

      const api = createOnlyFansAPI()
      api.setAccountId(ofAccountId)
      const result = await api.getConversations({ limit, offset })
      const chats = result.conversations || []
      return chats.map(normalizeOfChat).filter((x): x is RawConv => x != null)
    }

    async function loadFansly(): Promise<RawConv[]> {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token, platform_user_id')
        .eq('user_id', userId)
        .eq('platform', 'fansly')
        .eq('is_connected', true)
        .single()

      const fsAccountId = fanslyPartnerAccountIdFromRow(connection)
      if (!fsAccountId) {
        errors.push('fansly_disconnected')
        return []
      }

      const api = createFanslyAPI(fsAccountId)
      const result = await api.getChats({ limit, offset })
      const chats = result.data || []
      return chats.map(normalizeFanslyChat).filter((x): x is RawConv => x != null)
    }

    let raw: RawConv[] = []
    let hasMore = false

    if (platform === 'onlyfans') {
      try {
        raw = await loadOnlyFans()
        hasMore = raw.length >= limit
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        if (msg.includes('ONLYFANS_SESSION_EXPIRED')) {
          await supabase
            .from('platform_connections')
            .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
            .eq('user_id', userId)
            .eq('platform', 'onlyfans')
          await clearOnlyFansDmMessageCacheForUser(supabase, userId)
          return NextResponse.json(
            {
              error: 'OnlyFans session expired',
              code: 'ONLYFANS_SESSION_EXPIRED',
              message:
                'Your OnlyFans session with our data partner expired. Please reconnect OnlyFans from your dashboard.',
            },
            { status: 401 },
          )
        }
        throw e
      }
    } else if (platform === 'fansly') {
      raw = await loadFansly()
      hasMore = raw.length >= limit
    } else {
      const pool = Math.min(120, Math.max(limit + offset + 20, limit * 2))
      const { data: ofConn } = await supabase
        .from('platform_connections')
        .select('access_token, platform_user_id')
        .eq('user_id', userId)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .single()

      const { data: fsConn } = await supabase
        .from('platform_connections')
        .select('access_token, platform_user_id')
        .eq('user_id', userId)
        .eq('platform', 'fansly')
        .eq('is_connected', true)
        .single()

      const parts: RawConv[] = []
      const ofAccountIdAll = onlyFansPartnerAccountIdFromRow(ofConn)
      if (ofAccountIdAll) {
        try {
          const api = createOnlyFansAPI()
          api.setAccountId(ofAccountIdAll)
          const result = await api.getConversations({ limit: pool, offset: 0 })
          const chats = result.conversations || []
          parts.push(
            ...chats.map(normalizeOfChat).filter((x): x is RawConv => x != null),
          )
        } catch (e) {
          const msg = e instanceof Error ? e.message : ''
          if (msg.includes('ONLYFANS_SESSION_EXPIRED')) {
            await supabase
              .from('platform_connections')
              .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
              .eq('user_id', userId)
              .eq('platform', 'onlyfans')
            await clearOnlyFansDmMessageCacheForUser(supabase, userId)
          } else {
            errors.push('onlyfans_fetch_failed')
          }
        }
      } else {
        errors.push('onlyfans_disconnected')
      }

      const fsAccountIdAll = fanslyPartnerAccountIdFromRow(fsConn)
      if (fsAccountIdAll) {
        try {
          const api = createFanslyAPI(fsAccountIdAll)
          const result = await api.getChats({ limit: pool, offset: 0 })
          const chats = result.data || []
          parts.push(
            ...chats.map(normalizeFanslyChat).filter((x): x is RawConv => x != null),
          )
        } catch {
          errors.push('fansly_fetch_failed')
        }
      } else {
        errors.push('fansly_disconnected')
      }

      parts.sort((a, b) => {
        const da = new Date(a.lastMessage?.createdAt || 0).getTime()
        const db = new Date(b.lastMessage?.createdAt || 0).getTime()
        return db - da
      })
      raw = parts.slice(offset, offset + limit)
      hasMore = parts.length > offset + limit
    }

    const ofIds = raw.filter((r) => r.platform === 'onlyfans').map((r) => String(r.user.id))
    const fsIds = raw.filter((r) => r.platform === 'fansly').map((r) => String(r.user.id))

    const [crmOf, crmFs, churnOf, churnFs] = await Promise.all([
      ofIds.length ? fetchCrmMapForFanIds(supabase, userId, 'onlyfans', ofIds) : Promise.resolve(new Map()),
      fsIds.length ? fetchCrmMapForFanIds(supabase, userId, 'fansly', fsIds) : Promise.resolve(new Map()),
      ofIds.length ? fetchChurnSnapshotMapForFanIds(supabase, userId, 'onlyfans', ofIds) : Promise.resolve(new Map()),
      fsIds.length ? fetchChurnSnapshotMapForFanIds(supabase, userId, 'fansly', fsIds) : Promise.resolve(new Map()),
    ])

    let enriched: RawConv[] = raw.map((r) => {
      const map = r.platform === 'onlyfans' ? crmOf : crmFs
      const churnMap = r.platform === 'onlyfans' ? churnOf : churnFs
      const base = map.get(String(r.user.id)) ?? null
      const ch = churnMap.get(String(r.user.id))
      const crm: InboxCrmPayload | null = base
        ? { ...base, ...(ch ?? { churnRisk: null, churnOneLine: null }) }
        : null
      return { ...r, crm }
    })

    enriched = enriched.filter((row) =>
      matchesSearchQuery(search, row.user.username, row.user.name),
    )
    enriched = enriched.filter((row) => matchesTagFilter(tag, row.crm ?? undefined))

    if (unreadOnly) {
      enriched = enriched.filter((row) => row.unreadCount > 0)
    }

    enriched = enriched.filter((row) =>
      matchesInboxSegment(segment, row.unreadCount, row.crm ?? undefined),
    )

    enriched = sortEnrichedInbox(enriched, sort === 'recent' || sort === 'spend' || sort === 'unread' ? sort : 'recent')

    return NextResponse.json({
      conversations: enriched,
      hasMore,
      limit,
      offset,
      /** Client may use this as the next `offset` query param for append pagination. */
      nextOffset: offset + raw.length,
      meta: {
        platform,
        segment,
        sort,
        errors: errors.length ? errors : undefined,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to load inbox', details: message },
      { status: 500 },
    )
  }
}
