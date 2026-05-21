import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  createOnlyFansAPI,
  isOnlyFansRateLimitError,
  isOnlyFansUpstreamTransientError,
} from '@/lib/onlyfans-api'
import {
  ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE,
  onlyFansBillingGateResponse,
} from '@/lib/onlyfans-api-route'
import { clearOnlyFansDmMessageCacheForUser } from '@/lib/messages/of-dm-cache'
import { denyIfNonApiProtectionTier } from '@/lib/api-non-api-guard'

type ConversationsPayload = {
  conversations: unknown[]
  total: number
  stale?: true
  code?: 'ONLYFANS_RATE_LIMIT' | 'ONLYFANS_UPSTREAM'
}

const CONVERSATION_MIN_REFRESH_MS = 30_000
const CONVERSATION_RATE_LIMIT_BACKOFF_MS = 90_000
const CONVERSATION_CACHE_TTL_MS = 5 * 60_000

const conversationsCache = new Map<
  string,
  { payload: ConversationsPayload; fetchedAt: number; rateLimitedUntil?: number }
>()

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nonApi = await denyIfNonApiProtectionTier(request)
    if (nonApi) return nonApi

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    // Get the OnlyFans connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'OnlyFans not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const cacheKey = `${user.id}:${limit}:${offset}:${unreadOnly ? 'unread' : 'all'}`
    const now = Date.now()
    const cached = conversationsCache.get(cacheKey)
    if (cached) {
      if (now - cached.fetchedAt > CONVERSATION_CACHE_TTL_MS) {
        conversationsCache.delete(cacheKey)
      } else if (cached.rateLimitedUntil && cached.rateLimitedUntil > now) {
        return NextResponse.json(
          {
            ...cached.payload,
            stale: true as const,
            code: 'ONLYFANS_RATE_LIMIT' as const,
            error: 'OnlyFans is temporarily limiting chats. Reusing recent conversations.',
            retry_after_ms: cached.rateLimitedUntil - now,
          },
          { status: 200 },
        )
      } else if (now - cached.fetchedAt < CONVERSATION_MIN_REFRESH_MS) {
        return NextResponse.json({ ...cached.payload, stale: true as const })
      }
    }

    const result = await api.getConversations({ limit, offset, unreadOnly })
    const payload: ConversationsPayload = {
      conversations: result.conversations || [],
      total: result.total || 0,
    }
    conversationsCache.set(cacheKey, { payload, fetchedAt: now })
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Surface OnlyFans session expiry and auto-disconnect so the user can reconnect
    if (message.includes('ONLYFANS_SESSION_EXPIRED')) {
      try {
        const supabase = await createRouteHandlerClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('platform_connections')
            .update(ONLYFANS_EXPIRED_SESSION_CONNECTION_UPDATE)
            .eq('user_id', user.id)
            .eq('platform', 'onlyfans')
          await clearOnlyFansDmMessageCacheForUser(supabase, user.id)
        }
      } catch {
        // best-effort; still return 401
      }
      return NextResponse.json(
        {
          error: 'OnlyFans session expired',
          code: 'ONLYFANS_SESSION_EXPIRED',
          message:
            'Your OnlyFans session with our data partner expired. Please reconnect OnlyFans from your dashboard to continue syncing messages.',
        },
        { status: 401 }
      )
    }

    if (isOnlyFansRateLimitError(message)) {
      try {
        const supabase = await createRouteHandlerClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { searchParams } = new URL(request.url)
          const limit = parseInt(searchParams.get('limit') || '50')
          const offset = parseInt(searchParams.get('offset') || '0')
          const unreadOnly = searchParams.get('unreadOnly') === 'true'
          const cacheKey = `${user.id}:${limit}:${offset}:${unreadOnly ? 'unread' : 'all'}`
          const cached = conversationsCache.get(cacheKey)
          if (cached) {
            conversationsCache.set(cacheKey, {
              ...cached,
              rateLimitedUntil: Date.now() + CONVERSATION_RATE_LIMIT_BACKOFF_MS,
            })
            return NextResponse.json(
              {
                ...cached.payload,
                stale: true as const,
                code: 'ONLYFANS_RATE_LIMIT' as const,
                error: 'OnlyFans is temporarily limiting chats. Reusing recent conversations.',
                retry_after_ms: CONVERSATION_RATE_LIMIT_BACKOFF_MS,
              },
              { status: 200 },
            )
          }
        }
      } catch {
        // If cache lookup fails, fall back to standard rate-limit response below.
      }
      return NextResponse.json(
        {
          error: 'OnlyFans is temporarily limiting requests. Wait 30–60 seconds and try again.',
          code: 'ONLYFANS_RATE_LIMIT',
        },
        { status: 429 },
      )
    }

    if (isOnlyFansUpstreamTransientError(message)) {
      return NextResponse.json(
        {
          error:
            'OnlyFans had a temporary glitch. Wait a minute and try again. If this keeps happening, reconnect OnlyFans in Settings.',
          code: 'ONLYFANS_UPSTREAM',
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: message },
      { status: 500 },
    )
  }
}
