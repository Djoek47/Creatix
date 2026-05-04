import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { isOnlyFansRateLimitError, isOnlyFansUpstreamTransientError } from '@/lib/onlyfans-api'
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
import {
  resolveAllowedFocusPlatforms,
  subscriptionEnforcesFocusPlatforms,
  type SubscriptionFocusFields,
} from '@/lib/billing/platform-variant'
import { fetchOnlyFansInboxChatsCached, type InboxCachedOfConv } from '@/lib/onlyfans-inbox-chats-cache'

export const maxDuration = 60

type RawConv = {
  platform: 'onlyfans' | 'fansly'
  chatId?: string
  user: { id: string; username: string; name: string; avatar: string }
  lastMessage: { id: string; text: string; createdAt: string; isRead: boolean }
  unreadCount: number
  crm?: InboxCrmPayload | null
}

function normalizeOfChat(chat: any): InboxCachedOfConv | null {
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
    const forceRefreshInbox = searchParams.get('refresh') === 'true'
    /** Fansly List Chats: pass previous `meta.fansly_next_cursor` for the next page (ApiFansly cursor pagination). */
    const fanslyCursor = searchParams.get('fanslyCursor')?.trim() || undefined

    let onlyfansInboxStale = false
    let onlyfansInboxStaleReason: 'rate_limit' | 'min_refresh' | undefined
    let onlyfansInboxRetryAfterMs: number | undefined

    if (platform === 'onlyfans' || platform === 'fansly' || platform === 'all') {
      const billingBlock = await adultPlatformBillingGateWhenEitherConnected(supabase)
      if (billingBlock) return billingBlock
    }

    const { data: subFocus } = await supabase
      .from('subscriptions')
      .select('plan_id,status,billing_variant,billing_focus_platform,billing_focus_platforms')
      .eq('user_id', userId)
      .maybeSingle()

    let effectivePlatform: InboxPlatformFilter = platform
    if (
      (platform === 'onlyfans' || platform === 'fansly' || platform === 'all') &&
      subFocus &&
      subscriptionEnforcesFocusPlatforms(subFocus as SubscriptionFocusFields)
    ) {
      const allowed = resolveAllowedFocusPlatforms(
        (subFocus as SubscriptionFocusFields).billing_focus_platforms,
        (subFocus as SubscriptionFocusFields).billing_focus_platform,
      )
      const ofOk = allowed.includes('onlyfans')
      const fsOk = allowed.includes('fansly')
      if (platform === 'onlyfans' && !ofOk) {
        return NextResponse.json(
          {
            error:
              'OnlyFans is not on your current plan. Change plan in Billing, or choose the network your subscription includes.',
            code: 'BILLING_FOCUS_PLATFORM_DENIED',
          },
          { status: 403 },
        )
      }
      if (platform === 'fansly' && !fsOk) {
        return NextResponse.json(
          {
            error:
              'Fansly is not on your current plan. Change plan in Billing, or choose the network your subscription includes.',
            code: 'BILLING_FOCUS_PLATFORM_DENIED',
          },
          { status: 403 },
        )
      }
      if (platform === 'all') {
        if (ofOk && fsOk) effectivePlatform = 'all'
        else if (ofOk) effectivePlatform = 'onlyfans'
        else if (fsOk) effectivePlatform = 'fansly'
      }
    }

    const errors: string[] = []
    const providerErrors: Partial<Record<'onlyfans' | 'fansly', string>> = {}
    const noteProviderError = (provider: 'onlyfans' | 'fansly', code: string) => {
      errors.push(code)
      if (!providerErrors[provider]) providerErrors[provider] = code
    }

    async function loadOnlyFans(): Promise<RawConv[]> {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .single()

      if (!connection?.access_token) {
        noteProviderError('onlyfans', 'onlyfans_disconnected')
        return []
      }

      const cached = await fetchOnlyFansInboxChatsCached({
        userId,
        accessToken: connection.access_token,
        mode: { kind: 'paginated', limit, offset },
        forceRefresh: forceRefreshInbox,
        normalize: (chat) => normalizeOfChat(chat),
      })
      if (cached.stale) {
        onlyfansInboxStale = true
        onlyfansInboxStaleReason = cached.code === 'ONLYFANS_RATE_LIMIT' ? 'rate_limit' : 'min_refresh'
        if (cached.retryAfterMs != null) onlyfansInboxRetryAfterMs = cached.retryAfterMs
      }
      return cached.conversations as RawConv[]
    }

    async function loadFansly(): Promise<{
      convs: RawConv[]
      fanslyHasMore: boolean
      fanslyNextCursor: string | null | undefined
    }> {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('platform', 'fansly')
        .eq('is_connected', true)
        .single()

      if (!connection?.access_token) {
        noteProviderError('fansly', 'fansly_disconnected')
        return { convs: [], fanslyHasMore: false, fanslyNextCursor: undefined }
      }

      const api = createFanslyAPI(connection.access_token)
      const result = fanslyCursor
        ? await api.getChats({ singlePage: true, cursor: fanslyCursor, limit })
        : await api.getChats({ limit, offset })
      const chats = result.data || []
      const convs = chats.map(normalizeFanslyChat).filter((x): x is RawConv => x != null)
      return {
        convs,
        fanslyHasMore: Boolean(result.hasMore ?? result.nextCursor),
        fanslyNextCursor: result.nextCursor,
      }
    }

    let raw: RawConv[] = []
    let hasMore = false
    let fanslyNextCursor: string | null | undefined

    if (effectivePlatform === 'onlyfans') {
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
        if (isOnlyFansRateLimitError(msg)) {
          return NextResponse.json(
            {
              error: 'OnlyFans is temporarily limiting requests. Wait 30–60 seconds and refresh.',
              code: 'ONLYFANS_RATE_LIMIT',
            },
            { status: 429 },
          )
        }
        if (isOnlyFansUpstreamTransientError(msg)) {
          return NextResponse.json(
            {
              error:
                'OnlyFans had a temporary glitch loading chats. Wait a minute and refresh, or open Messages again.',
              code: 'ONLYFANS_UPSTREAM',
            },
            { status: 503 },
          )
        }
        throw e
      }
    } else if (effectivePlatform === 'fansly') {
      try {
        const pack = await loadFansly()
        raw = pack.convs
        fanslyNextCursor = pack.fanslyNextCursor
        hasMore = pack.fanslyHasMore
      } catch {
        noteProviderError('fansly', 'fansly_fetch_failed')
        raw = []
      }
    } else {
      // Fixed pool size keeps OnlyFans inbox cache key stable across pagination (see inboxOnlyFansChatsCacheKey pool mode).
      const pool = 55
      const { data: ofConn } = await supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .single()

      const { data: fsConn } = await supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('platform', 'fansly')
        .eq('is_connected', true)
        .single()

      const parts: RawConv[] = []
      if (ofConn?.access_token) {
        try {
          const cached = await fetchOnlyFansInboxChatsCached({
            userId,
            accessToken: ofConn.access_token,
            mode: { kind: 'pool', pool },
            forceRefresh: forceRefreshInbox,
            normalize: (chat) => normalizeOfChat(chat),
          })
          if (cached.stale) {
            onlyfansInboxStale = true
            onlyfansInboxStaleReason =
              cached.code === 'ONLYFANS_RATE_LIMIT' ? 'rate_limit' : 'min_refresh'
            if (cached.retryAfterMs != null) onlyfansInboxRetryAfterMs = cached.retryAfterMs
          }
          parts.push(...(cached.conversations as RawConv[]))
        } catch (e) {
          const msg = e instanceof Error ? e.message : ''
          if (isOnlyFansRateLimitError(msg)) {
            return NextResponse.json(
              {
                error: 'OnlyFans is temporarily limiting requests. Wait 30–60 seconds and refresh.',
                code: 'ONLYFANS_RATE_LIMIT',
              },
              { status: 429 },
            )
          }
          if (isOnlyFansUpstreamTransientError(msg)) {
            return NextResponse.json(
              {
                error:
                  'OnlyFans had a temporary glitch loading chats. Wait a minute and refresh, or open Messages again.',
                code: 'ONLYFANS_UPSTREAM',
              },
              { status: 503 },
            )
          }
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
          if (isOnlyFansUpstreamTransientError(msg)) {
            errors.push('onlyfans_upstream_transient')
          } else {
            noteProviderError('onlyfans', 'onlyfans_fetch_failed')
          }
        }
      } else {
        noteProviderError('onlyfans', 'onlyfans_disconnected')
      }

      if (fsConn?.access_token) {
        try {
          const api = createFanslyAPI(fsConn.access_token)
          const result = await api.getChats({ limit: pool, offset: 0 })
          const chats = result.data || []
          parts.push(
            ...chats.map(normalizeFanslyChat).filter((x): x is RawConv => x != null),
          )
        } catch {
          noteProviderError('fansly', 'fansly_fetch_failed')
        }
      } else {
        noteProviderError('fansly', 'fansly_disconnected')
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
        degraded: Object.keys(providerErrors).length > 0,
        partial:
          platform === 'all' &&
          Object.keys(providerErrors).length > 0 &&
          enriched.length > 0,
        provider_errors:
          Object.keys(providerErrors).length > 0 ? providerErrors : undefined,
        errors: errors.length ? errors : undefined,
        ...(onlyfansInboxStale
          ? {
              onlyfans_inbox_stale: true as const,
              onlyfans_inbox_stale_reason: onlyfansInboxStaleReason,
              ...(onlyfansInboxRetryAfterMs != null
                ? { onlyfans_inbox_retry_after_ms: onlyfansInboxRetryAfterMs }
                : {}),
            }
          : {}),
        ...(effectivePlatform === 'fansly' &&
        fanslyNextCursor != null &&
        String(fanslyNextCursor).trim() !== ''
          ? { fansly_next_cursor: String(fanslyNextCursor).trim() }
          : {}),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (isOnlyFansRateLimitError(message)) {
      return NextResponse.json(
        {
          error: 'OnlyFans is temporarily limiting requests. Wait 30–60 seconds and refresh.',
          code: 'ONLYFANS_RATE_LIMIT',
        },
        { status: 429 },
      )
    }
    if (isOnlyFansUpstreamTransientError(message)) {
      return NextResponse.json(
        {
          error:
            'OnlyFans had a temporary glitch loading chats. Wait a minute and refresh, or open Messages again.',
          code: 'ONLYFANS_UPSTREAM',
        },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to load inbox', details: message },
      { status: 500 },
    )
  }
}
