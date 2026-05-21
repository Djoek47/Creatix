/**
 * Server-side cache + singleflight for OnlyFans GET /chats (getConversations) used by /api/messages/inbox.
 * Reduces burst traffic to the partner (Cloudflare / OnlyFans.com limits) while keeping UX responsive.
 */
import { createOnlyFansAPI, isOnlyFansRateLimitError } from '@/lib/onlyfans-api'

const MIN_REFRESH_MS = 60_000
const CACHE_TTL_MS = 5 * 60_000
const RATE_LIMIT_BACKOFF_MS = 90_000

export type InboxCachedOfConv = {
  platform: 'onlyfans'
  chatId?: string
  user: { id: string; username: string; name: string; avatar: string }
  lastMessage: { id: string; text: string; createdAt: string; isRead: boolean }
  unreadCount: number
}

type CacheEntry = {
  conversations: InboxCachedOfConv[]
  fetchedAt: number
  rateLimitedUntil?: number
}

const store = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<InboxCachedOfConv[]>>()

function accountFingerprint(accessToken: string): string {
  return accessToken.length > 16 ? accessToken.slice(0, 16) : accessToken
}

export function inboxOnlyFansChatsCacheKey(
  userId: string,
  accessToken: string,
  mode: { kind: 'paginated'; limit: number; offset: number } | { kind: 'pool'; pool: number },
): string {
  const fp = accountFingerprint(accessToken)
  if (mode.kind === 'pool') {
    return `${userId}:${fp}:pool:${mode.pool}`
  }
  return `${userId}:${fp}:p:${mode.limit}:${mode.offset}`
}

export type FetchOnlyFansInboxChatsResult = {
  conversations: InboxCachedOfConv[]
  stale: boolean
  bypassedMinRefresh?: boolean
  code?: 'ONLYFANS_RATE_LIMIT'
  retryAfterMs?: number
}

/**
 * Returns normalized OnlyFans inbox rows, using cache + min-refresh + singleflight.
 * On partner rate limit, returns last good rows with stale + code when available.
 */
export async function fetchOnlyFansInboxChatsCached(args: {
  userId: string
  accessToken: string
  mode: { kind: 'paginated'; limit: number; offset: number } | { kind: 'pool'; pool: number }
  forceRefresh: boolean
  normalize: (chat: unknown) => InboxCachedOfConv | null
}): Promise<FetchOnlyFansInboxChatsResult> {
  const key = inboxOnlyFansChatsCacheKey(args.userId, args.accessToken, args.mode)
  const now = Date.now()
  const cached = store.get(key)

  if (cached && now - cached.fetchedAt > CACHE_TTL_MS) {
    store.delete(key)
  }

  const entryAfterTtl = store.get(key)

  if (entryAfterTtl?.rateLimitedUntil && entryAfterTtl.rateLimitedUntil > now) {
    return {
      conversations: entryAfterTtl.conversations,
      stale: true,
      code: 'ONLYFANS_RATE_LIMIT',
      retryAfterMs: entryAfterTtl.rateLimitedUntil - now,
    }
  }

  if (
    entryAfterTtl &&
    !args.forceRefresh &&
    now - entryAfterTtl.fetchedAt < MIN_REFRESH_MS
  ) {
    return {
      conversations: entryAfterTtl.conversations,
      stale: true,
      bypassedMinRefresh: true,
    }
  }

  const runFetch = async (): Promise<InboxCachedOfConv[]> => {
    const api = createOnlyFansAPI()
    api.setAccountId(args.accessToken)
    const params =
      args.mode.kind === 'pool'
        ? { limit: args.mode.pool, offset: 0 }
        : { limit: args.mode.limit, offset: args.mode.offset }
    const result = await api.getConversations(params)
    const chats = result.conversations || []
    return chats
      .map((c) => args.normalize(c))
      .filter((x): x is InboxCachedOfConv => x != null)
  }

  let rows: InboxCachedOfConv[]
  try {
    const existingInflight = inflight.get(key)
    if (existingInflight) {
      rows = await existingInflight
    } else {
      const p = runFetch().finally(() => inflight.delete(key))
      inflight.set(key, p)
      rows = await p
    }
    store.set(key, { conversations: rows, fetchedAt: Date.now() })
    return { conversations: rows, stale: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? '')
    if (isOnlyFansRateLimitError(msg)) {
      const prev = store.get(key)
      const until = Date.now() + RATE_LIMIT_BACKOFF_MS
      if (prev && prev.conversations.length > 0) {
        store.set(key, {
          ...prev,
          rateLimitedUntil: until,
        })
        return {
          conversations: prev.conversations,
          stale: true,
          code: 'ONLYFANS_RATE_LIMIT',
          retryAfterMs: RATE_LIMIT_BACKOFF_MS,
        }
      }
      store.set(key, {
        conversations: [],
        fetchedAt: Date.now(),
        rateLimitedUntil: until,
      })
    }
    throw e
  }
}
