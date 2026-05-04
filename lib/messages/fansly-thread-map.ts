/**
 * Normalize ApiFansly chat message payloads for the shared Messages UI
 * (same shape as OnlyFans thread messages from `/api/onlyfans/messages/[fanId]`).
 */

export type UnifiedThreadMessage = {
  id: string | number
  fromUser: {
    id: string | number
    username?: string
    name?: string
    avatar?: string
  }
  text: string
  createdAt: string
  isRead?: boolean
  isSentByMe?: boolean
  media?: Array<{
    id: number | string
    type: 'photo' | 'video'
    canView?: boolean
    url?: string
    files?: {
      full?: { url: string | null; width?: number; height?: number }
      thumb?: { url: string | null }
    }
  }>
}

export function digRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Extract chat rows from nested ApiFansly envelopes (GET chats list). */
export function extractFanslyChatsArray(raw: unknown): unknown[] {
  const root = digRecord(raw)
  if (!root) return []
  const d0 = digRecord(root.data)
  if (Array.isArray(d0)) return d0
  if (d0 && Array.isArray(d0.chats)) return d0.chats as unknown[]
  const d1 = digRecord(d0?.data as unknown)
  if (d1 && Array.isArray(d1.chats)) return d1.chats as unknown[]
  const resp = digRecord(d0?.response as unknown) ?? digRecord(d1?.response as unknown)
  if (resp && Array.isArray(resp.chats)) return resp.chats as unknown[]
  // ApiFansly List Chats: `response.data` is the chat row array (see docs.apifansly.com list-chats).
  if (resp && Array.isArray(resp.data)) return resp.data as unknown[]
  return []
}

/** `aggregationData.accounts` from List Chats (peer profile rows keyed by account id). */
export function extractFanslyChatAggregationAccounts(raw: unknown): Record<string, unknown>[] {
  const root = digRecord(raw)
  const d0 = digRecord(root?.data)
  const inner = digRecord(d0?.data)
  const resp = digRecord(inner?.response) ?? digRecord(d0?.response)
  const agg = digRecord(resp?.aggregationData)
  const list = agg && Array.isArray(agg.accounts) ? agg.accounts : []
  const out: Record<string, unknown>[] = []
  for (const x of list) {
    const r = digRecord(x)
    if (r) out.push(r)
  }
  return out
}

/** Pagination cursor for List Chats (`data.nextCursor` on partner envelope). */
export function extractFanslyChatsNextCursor(raw: unknown): string | undefined {
  const root = digRecord(raw)
  const d0 = digRecord(root?.data)
  const inner = digRecord(d0?.data)
  const respInner = inner ? digRecord(inner.response as unknown) : null
  const c =
    d0?.nextCursor ??
    d0?.next_cursor ??
    inner?.nextCursor ??
    inner?.next_cursor ??
    respInner?.nextCursor ??
    respInner?.next_cursor
  if (typeof c === 'string') {
    const t = c.trim()
    if (t.length > 0) return t
  }
  if (typeof c === 'number' && Number.isFinite(c) && c !== 0) {
    return String(c)
  }
  return undefined
}

function pickFanslyAccountAvatarUrl(acc: Record<string, unknown> | undefined): string {
  if (!acc) return ''
  if (typeof acc.avatar === 'string' && acc.avatar.trim()) return acc.avatar.trim()
  const av = digRecord(acc.avatar)
  if (av) {
    const loc0 = typeof av.location === 'string' ? av.location.trim() : ''
    if (loc0 && /^https?:\/\//i.test(loc0)) return loc0
    const locs = Array.isArray(av.locations) ? av.locations : []
    for (const L of locs) {
      const lr = digRecord(L)
      const u = typeof lr?.location === 'string' ? lr.location.trim() : ''
      if (u && /^https?:\/\//i.test(u)) return u
    }
  }
  return ''
}

/** Map List Chats `response.data[]` + aggregation accounts → inbox `normalizeFanslyChat` input shape. */
export function normalizeFanslyChatListItem(
  row: unknown,
  accountsById: Map<string, Record<string, unknown>>,
): {
  id: string
  user: { id: string; username: string; displayName: string; avatar: string }
  lastMessage: string
  unreadCount: number
  updatedAt: string
} | null {
  const o = digRecord(row)
  if (!o) return null
  const chatId = o.groupId != null ? String(o.groupId) : o.id != null ? String(o.id) : ''
  const peerId = o.partnerAccountId != null ? String(o.partnerAccountId) : ''
  if (!chatId || !peerId) return null

  const acc = accountsById.get(peerId)
  const username =
    (typeof acc?.username === 'string' && acc.username.trim()) ||
    (typeof o.partnerUsername === 'string' && o.partnerUsername.trim()) ||
    peerId
  const displayName =
    (typeof acc?.displayName === 'string' && acc.displayName.trim()) ||
    (typeof acc?.display_name === 'string' && String(acc.display_name).trim()) ||
    username

  const lastSeen =
    acc?.lastSeenAt != null
      ? typeof acc.lastSeenAt === 'number'
        ? acc.lastSeenAt
        : Number(acc.lastSeenAt)
      : null
  const updatedAt =
    lastSeen != null && Number.isFinite(lastSeen)
      ? new Date(lastSeen < 1e12 ? lastSeen * 1000 : lastSeen).toISOString()
      : new Date().toISOString()

  return {
    id: chatId,
    user: {
      id: peerId,
      username,
      displayName,
      avatar: pickFanslyAccountAvatarUrl(acc),
    },
    lastMessage: '',
    unreadCount: typeof o.unreadCount === 'number' ? Math.max(0, o.unreadCount) : 0,
    updatedAt,
  }
}

/** Extract raw message rows from nested ApiFansly envelopes. */
export function extractFanslyChatMessagesArray(raw: unknown): unknown[] {
  const root = digRecord(raw)
  if (!root) return []
  const d0 = digRecord(root.data)
  if (!d0) return []
  if (Array.isArray(d0.messages)) return d0.messages
  const d1 = digRecord(d0.data)
  if (d1) {
    const resp = digRecord(d1.response)
    if (resp && Array.isArray(resp.messages)) return resp.messages
    if (Array.isArray(d1.messages)) return d1.messages
  }
  const resp2 = digRecord(d0.response)
  if (resp2 && Array.isArray(resp2.messages)) return resp2.messages
  return []
}

function toIso(ts: unknown): string {
  if (typeof ts === 'string' && ts.trim()) {
    const t = Date.parse(ts)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
    return ts
  }
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    // seconds vs ms
    const ms = ts < 1e12 ? ts * 1000 : ts
    return new Date(ms).toISOString()
  }
  return new Date().toISOString()
}

export function mapFanslyChatRowToThreadMessage(
  row: unknown,
  opts: { fanUserId: string; creatorAccountLabel?: string },
): UnifiedThreadMessage | null {
  const o = digRecord(row)
  if (!o) return null
  const id = o.id ?? o.messageId ?? o.uuid
  if (id == null) return null

  const fromUserRaw = digRecord(o.fromUser) ?? digRecord(o.sender) ?? digRecord(o.user)
  const fromUserId = fromUserRaw?.id ?? o.fromUserId ?? o.senderId ?? 'unknown'
  const text =
    typeof o.text === 'string'
      ? o.text
      : typeof o.content === 'string'
        ? o.content
        : typeof o.body === 'string'
          ? o.body
          : ''

  const createdAt = toIso(o.createdAt ?? o.created_at ?? o.timestamp ?? o.sentAt)

  const fromUserBool = typeof o.fromUser === 'boolean' ? o.fromUser : undefined
  const fanId = String(opts.fanUserId)
  const fromIdStr = String(fromUserId)
  let isSentByMe =
    o.isFromCreator === true ||
    o.sentByMe === true ||
    o.isCreator === true ||
    (typeof o.direction === 'string' && o.direction.toLowerCase() === 'outbound')

  if (!isSentByMe && fromUserBool === true) isSentByMe = true
  if (!isSentByMe && fromUserBool === false) isSentByMe = false
  if (!isSentByMe && fromIdStr && fanId) {
    isSentByMe = fromIdStr !== fanId
  }

  const mediaRaw = Array.isArray(o.media) ? o.media : Array.isArray(o.attachments) ? o.attachments : []
  const media = mediaRaw
    .map((m) => {
      const mr = digRecord(m)
      if (!mr) return null
      const mid = mr.id ?? mr.mediaId ?? mr.attachmentId
      if (mid == null) return null
      const t = String(mr.type ?? mr.mimetype ?? '').toLowerCase()
      const type: 'photo' | 'video' = t.includes('video') ? 'video' : 'photo'
      const url =
        typeof mr.url === 'string'
          ? mr.url
          : typeof mr.src === 'string'
            ? mr.src
            : undefined
      const loc = digRecord(mr.location)
      const locUrl = typeof loc?.url === 'string' ? loc.url : undefined
      return {
        id: mid as string | number,
        type,
        canView: true,
        url: url ?? locUrl,
        files: url || locUrl ? { full: { url: url ?? locUrl ?? null } } : undefined,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)

  return {
    id,
    fromUser: {
      id: fromUserId as string | number,
      username: typeof fromUserRaw?.username === 'string' ? fromUserRaw.username : undefined,
      name:
        typeof fromUserRaw?.displayName === 'string'
          ? fromUserRaw.displayName
          : typeof fromUserRaw?.name === 'string'
            ? fromUserRaw.name
            : undefined,
      avatar: typeof fromUserRaw?.avatar === 'string' ? fromUserRaw.avatar : undefined,
    },
    text,
    createdAt,
    isSentByMe,
    media: media.length ? media : undefined,
  }
}

export function mapFanslyChatMessages(
  rows: unknown[],
  opts: { fanUserId: string },
): UnifiedThreadMessage[] {
  const out: UnifiedThreadMessage[] = []
  for (const row of rows) {
    const m = mapFanslyChatRowToThreadMessage(row, opts)
    if (m) out.push(m)
  }
  return out
}
