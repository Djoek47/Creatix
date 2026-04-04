import { type NextRequest, NextResponse, after } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { validateChatMediaIdsForSend } from '@/lib/onlyfans-chat-media'
import { createOnlyFansAPI, isOnlyFansRateLimitError } from '@/lib/onlyfans-api'
import {
  clearOnlyFansDmMessageCacheForUser,
  loadOnlyFansDmMessageCache,
  OF_DM_BACKGROUND_REFRESH_MIN_INTERVAL_MS,
  OF_DM_CACHE_READ_MAX,
  sortOnlyFansMessagesAsc,
  syncOnlyFansDmTailAndMarkRemoved,
  upsertOnlyFansDmMessageCache,
} from '@/lib/messages/of-dm-cache'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'
import { logMessageSendEvent } from '@/lib/usage/log-message-send'
import { bumpSubscriptionMessagesSent } from '@/lib/usage/bump-messages-sent'

class OnlyFansNotConnectedError extends Error {
  override readonly name = 'OnlyFansNotConnectedError'
  constructor() {
    super('OnlyFans not connected')
  }
}

// GET - Fetch messages with a specific fan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '100', 10)), 100)
    const before = searchParams.get('before') || undefined
    const forceRefresh = searchParams.get('refresh') === '1'

    const cacheReadLimit = Math.min(OF_DM_CACHE_READ_MAX, Math.max(limit, 100))

    const fetchFromOnlyFansAndCache = async () => {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .maybeSingle()

      if (!connection?.access_token) {
        throw new OnlyFansNotConnectedError()
      }

      const api = createOnlyFansAPI()
      api.setAccountId(connection.access_token)
      const result = await api.getMessages(fanId, { limit, before })
      const list = result.messages || []
      await syncOnlyFansDmTailAndMarkRemoved(supabase, user.id, fanId, list)
      return sortOnlyFansMessagesAsc(list)
    }

    // Pagination cursors must hit the platform (cache is tail-only for now).
    if (before) {
      try {
        const messages = await fetchFromOnlyFansAndCache()
        return NextResponse.json({ messages, source: 'onlyfans' })
      } catch (e) {
        if (e instanceof OnlyFansNotConnectedError) {
          return NextResponse.json({ error: e.message }, { status: 400 })
        }
        throw e
      }
    }

    if (forceRefresh) {
      try {
        const messages = await fetchFromOnlyFansAndCache()
        return NextResponse.json({ messages, source: 'onlyfans' })
      } catch (e) {
        if (e instanceof OnlyFansNotConnectedError) {
          await clearOnlyFansDmMessageCacheForUser(supabase, user.id)
          return NextResponse.json({ error: e.message }, { status: 400 })
        }
        const { messages: cached } = await loadOnlyFansDmMessageCache(
          supabase,
          user.id,
          fanId,
          cacheReadLimit,
        )
        if (cached.length > 0) {
          return NextResponse.json({
            messages: sortOnlyFansMessagesAsc(cached),
            source: 'cache',
            stale: true,
          })
        }
        throw e
      }
    }

    const [cacheResult, connResult] = await Promise.all([
      loadOnlyFansDmMessageCache(supabase, user.id, fanId, cacheReadLimit),
      supabase
        .from('platform_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .maybeSingle(),
    ])

    const { messages: cached, newestSyncedAtMs } = cacheResult
    const connected = Boolean(connResult.data?.access_token)

    if (!connected) {
      if (cached.length > 0) {
        await clearOnlyFansDmMessageCacheForUser(supabase, user.id)
      }
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    if (cached.length === 0) {
      try {
        const messages = await fetchFromOnlyFansAndCache()
        return NextResponse.json({ messages, source: 'onlyfans' })
      } catch (e) {
        if (e instanceof OnlyFansNotConnectedError) {
          return NextResponse.json({ error: e.message }, { status: 400 })
        }
        throw e
      }
    }

    const messages = sortOnlyFansMessagesAsc(cached)
    const cacheFreshEnough =
      newestSyncedAtMs > 0 &&
      Date.now() - newestSyncedAtMs < OF_DM_BACKGROUND_REFRESH_MIN_INTERVAL_MS

    if (!cacheFreshEnough) {
      after(async () => {
        try {
          const { data: connection } = await supabase
            .from('platform_connections')
            .select('access_token')
            .eq('user_id', user.id)
            .eq('platform', 'onlyfans')
            .eq('is_connected', true)
            .maybeSingle()

          if (!connection?.access_token) return

          const api = createOnlyFansAPI()
          api.setAccountId(connection.access_token)
          const result = await api.getMessages(fanId, { limit })
          await syncOnlyFansDmTailAndMarkRemoved(supabase, user.id, fanId, result.messages || [])
        } catch (e) {
          console.warn('[of-dm-cache] background refresh failed:', e)
        }
      })
    }

    return NextResponse.json({ messages, source: 'cache' })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    const msg = error instanceof Error ? error.message : String(error)
    const rateLimited = isOnlyFansRateLimitError(msg)
    return NextResponse.json(
      {
        error: rateLimited
          ? 'OnlyFans is temporarily limiting requests. Wait a minute, then refresh or reopen this chat.'
          : 'Failed to load messages',
        code: rateLimited ? 'ONLYFANS_RATE_LIMIT' : undefined,
      },
      { status: rateLimited ? 429 : 500 },
    )
  }
}

// POST - Send a message to a fan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await params
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const body = await request.json()
    const { text, mediaIds, previews, price } = body
    const trimmed = typeof text === 'string' ? text.trim() : ''
    const hasText = trimmed.length > 0
    const hasMedia = Array.isArray(mediaIds) && mediaIds.length > 0

    if (!hasText && !hasMedia) {
      return NextResponse.json({ error: 'Message text or media required' }, { status: 400 })
    }

    // OnlyFans rule: all paid messages must contain at least one media file
    if (typeof price === 'number' && price > 0 && !hasMedia) {
      return NextResponse.json(
        { error: 'Paid messages must include at least one media file.' },
        { status: 400 },
      )
    }

    const mediaErr = validateChatMediaIdsForSend(mediaIds)
    if (mediaErr) {
      return NextResponse.json({ error: mediaErr }, { status: 400 })
    }

    // previews must be subset of mediaIds if provided
    if (Array.isArray(previews) && previews.length > 0 && hasMedia) {
      const mediaSet = new Set(mediaIds.map((m: string | number) => String(m)))
      const invalid = previews.find((p: string | number) => !mediaSet.has(String(p)))
      if (invalid !== undefined) {
        return NextResponse.json(
          { error: 'Preview media must also be included in media files.' },
          { status: 400 },
        )
      }
    }

    const result = await api.sendMessage(fanId, {
      text: trimmed || '',
      mediaFiles: hasMedia ? mediaIds : undefined,
      previews: Array.isArray(previews) && previews.length > 0 ? previews : undefined,
      price: typeof price === 'number' && price >= 0 ? price : undefined,
    })

    await upsertOnlyFansDmMessageCache(supabase, user.id, fanId, [result])

    logMessageSendEvent({
      userId: user.id,
      platform: 'onlyfans',
      fanId,
      source: 'chat_dm',
      metadata: { hasMedia: hasMedia, hasPrice: typeof price === 'number' && price > 0 },
    })
    bumpSubscriptionMessagesSent(user.id, 1)

    return NextResponse.json({
      success: true,
      message: result,
    })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
