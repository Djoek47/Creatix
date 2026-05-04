import { normalizeFanslyIncomingPpvUsd } from '@/lib/fansly/ppv-send'

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
  /** Teaser thumbnails (e.g. when media refs exist but URLs are withheld). */
  previews?: { url: string }[]
  /** Max PPV price among attachments (USD), when any attachment is paid. */
  price?: number | null
  /** True when all priced attachments are unlocked for the requesting account. */
  isPaid?: boolean
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

/**
 * Pagination cursor for List Chat Messages (`response.cursor` — next page of older messages).
 * @see https://docs.apifansly.com/api-reference/chat-messages/list-chat-messages
 */
export function extractFanslyChatMessagesNextCursor(raw: unknown): string | undefined {
  const root = digRecord(raw)
  const d0 = digRecord(root?.data)
  const inner = digRecord(d0?.data)
  const resp = digRecord(inner?.response) ?? digRecord(d0?.response)
  const c = resp?.cursor ?? inner?.cursor ?? d0?.cursor
  if (typeof c === 'string') {
    const t = c.trim()
    if (t.length > 0) return t
  }
  if (typeof c === 'number' && Number.isFinite(c) && c !== 0) {
    return String(c)
  }
  return undefined
}

/** Nested `response` object from List Chat Messages (messages + aggregated `accountMedia`). */
function fanslyListChatMessagesResponse(raw: unknown): Record<string, unknown> | null {
  const root = digRecord(raw)
  if (!root) return null
  const d0 = digRecord(root.data)
  if (!d0) return null
  const inner = digRecord(d0.data)
  return digRecord(inner?.response) ?? digRecord(d0.response)
}

/**
 * Account media blobs shipped alongside message rows (`response.accountMedia`).
 * @see https://docs.apifansly.com/api-reference/chat-messages/list-chat-messages
 */
export function extractFanslyChatMessagesAccountMedia(raw: unknown): unknown[] {
  const resp = fanslyListChatMessagesResponse(raw)
  if (!resp) return []
  const am = resp.accountMedia
  return Array.isArray(am) ? am : []
}

export function dedupeFanslyChatAccountMediaRows(rows: unknown[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>()
  for (const item of rows) {
    const r = digRecord(item)
    if (!r || r.id == null) continue
    byId.set(String(r.id), r)
  }
  return [...byId.values()]
}

/**
 * Lookup map: attachment `contentId` / nested `media.id` → accountMedia envelope.
 */
export function buildFanslyChatAccountMediaIndex(rows: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>()
  const reg = (k: unknown, row: Record<string, unknown>) => {
    if (k == null) return
    const t = String(k).trim()
    if (!t || m.has(t)) return
    m.set(t, row)
  }
  for (const row of rows) {
    reg(row.id, row)
    reg(row.mediaId, row)
    const nested = digRecord(row.media)
    if (nested) reg(nested.id, row)
  }
  return m
}

const FANSLY_MEDIA_CDN = 'https://cdn3.fansly.com'

/** Resolve a display CDN URL from a Fansly media or account-media envelope. */
export function pickFanslyMediaPresentationUrl(blob: Record<string, unknown>): string | null {
  const direct =
    typeof blob.url === 'string'
      ? blob.url
      : typeof blob.src === 'string'
        ? blob.src
        : typeof blob.previewUrl === 'string'
          ? blob.previewUrl
          : null
  if (direct?.trim()) {
    const t = direct.trim()
    if (/^https?:\/\//i.test(t)) return t
    if (t.startsWith('/')) return `${FANSLY_MEDIA_CDN}${t}`
  }

  const locTop = typeof blob.location === 'string' ? blob.location.trim() : ''
  if (locTop) {
    if (/^https?:\/\//i.test(locTop)) return locTop
    if (locTop.startsWith('/')) return `${FANSLY_MEDIA_CDN}${locTop}`
  }

  const topLocs = Array.isArray(blob.locations) ? blob.locations : []
  for (const L of topLocs) {
    const lr = digRecord(L)
    const u = typeof lr?.location === 'string' ? lr.location.trim() : ''
    if (/^https?:\/\//i.test(u)) return u
    if (u.startsWith('/')) return `${FANSLY_MEDIA_CDN}${u}`
  }

  const variants = Array.isArray(blob.variants) ? blob.variants : []
  for (const v of variants) {
    const vr = digRecord(v)
    if (!vr) continue
    const locs = Array.isArray(vr.locations) ? vr.locations : []
    for (const L of locs) {
      const lr = digRecord(L)
      const u = typeof lr?.location === 'string' ? lr.location.trim() : ''
      if (/^https?:\/\//i.test(u)) return u
      if (u.startsWith('/')) return `${FANSLY_MEDIA_CDN}${u}`
    }
    const vv = typeof vr.location === 'string' ? vr.location.trim() : ''
    if (/^https?:\/\//i.test(vv)) return vv
    if (vv.startsWith('/')) return `${FANSLY_MEDIA_CDN}${vv}`
  }
  return null
}

function inferFanslyBlobMediaType(blob: Record<string, unknown>): 'photo' | 'video' {
  const t = String(blob.type ?? blob.mediaType ?? blob.mimetype ?? '').toLowerCase()
  if (t.includes('video') || t.includes('mp4') || /\bvideo\b/.test(t)) return 'video'
  return 'photo'
}

function attachmentContentTypeGuess(ct: unknown): 'photo' | 'video' | undefined {
  if (typeof ct !== 'number') return undefined
  if (ct === 2 || ct >= 100) return 'video'
  return undefined
}

/** Keep message / media identifiers JSON-shaped (drops nested objects). */
function fanslyScalarId(v: unknown): string | number | undefined {
  if (v == null) return undefined
  if (typeof v === 'string' || typeof v === 'number') return v
  return undefined
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
  opts: {
    fanUserId: string
    creatorAccountLabel?: string
    accountMediaIndex?: Map<string, Record<string, unknown>>
  },
): UnifiedThreadMessage | null {
  const o = digRecord(row)
  if (!o) return null
  const idRaw = o.id ?? o.messageId ?? o.uuid
  if (idRaw == null) return null
  const id: string | number =
    typeof idRaw === 'string' || typeof idRaw === 'number' ? idRaw : String(idRaw)

  const fromUserRaw = digRecord(o.fromUser) ?? digRecord(o.sender) ?? digRecord(o.user)
  const fromUserId = fromUserRaw?.id ?? o.senderId ?? o.fromUserId ?? 'unknown'
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

  const idx = opts.accountMediaIndex
  const seenIds = new Set<string>()
  const media: NonNullable<UnifiedThreadMessage['media']> = []
  const previews: { url: string }[] = []
  let maxPpv = 0
  const ppvUnlocks: boolean[] = []

  const attachPreviewUrls = (u: string | null | undefined) => {
    const t = (u ?? '').trim()
    if (!t || previews.some((p) => p.url === t)) return
    previews.push({ url: t })
  }

  const pushMediaEntry = (
    rawId: string | number | undefined,
    type: 'photo' | 'video',
    url: string | null,
    canView: boolean,
    posFallback: number,
  ) => {
    const sid =
      rawId != null
        ? String(rawId).trim()
        : `${String(id)}::${String(media.length)}::${posFallback}`
    const key = `${sid}:${posFallback}`
    if (seenIds.has(key)) return
    seenIds.add(key)
    if (url?.trim()) {
      attachPreviewUrls(url.trim())
      if (canView) {
        media.push({
          id: sid as string | number,
          type,
          canView: true as const,
          url: url.trim(),
          files: { full: { url: url.trim() } },
        })
        return
      }
      media.push({
        id: sid as string | number,
        type,
        canView: false as const,
        url: undefined,
        files: { full: { url: url.trim() } },
      })
      return
    }
    if (!canView) {
      media.push({
        id: sid as string | number,
        type,
        canView: false as const,
      })
    }
  }

  function resolveAccountMediaEnvelope(ar: Record<string, unknown>): Record<string, unknown> | undefined {
    const keys = [
      ar.contentId,
      ar.content_id,
      ar.mediaId,
      ar.accountMediaId,
      ar.id,
      ar.attachmentId,
    ]
    if (!idx) return undefined
    for (const k of keys) {
      if (k == null) continue
      const hit = idx.get(String(k))
      if (hit) return hit
    }
    return undefined
  }

  const attachments = Array.isArray(o.attachments) ? o.attachments : []
  attachments.forEach((att, ai) => {
    const ar = digRecord(att)
    if (!ar) return

    const amEnv = resolveAccountMediaEnvelope(ar)
    const pickTarget =
      (amEnv && (digRecord(amEnv.media as unknown) ?? amEnv)) ??
      digRecord(ar.media as unknown) ??
      ar

    const url = pickFanslyMediaPresentationUrl(pickTarget)
    const type =
      attachmentContentTypeGuess(ar.contentType ?? ar.content_type) ??
      inferFanslyBlobMediaType(pickTarget)

    const rawPriceUsd = normalizeFanslyIncomingPpvUsd(amEnv?.price ?? ar.price)
    if (rawPriceUsd != null) {
      maxPpv = Math.max(maxPpv, rawPriceUsd)
      const unlocked =
        amEnv?.access === true || amEnv?.purchased === true || amEnv?.whitelisted === true
      ppvUnlocks.push(unlocked)
      pushMediaEntry(
        fanslyScalarId(amEnv?.id) ??
          fanslyScalarId(ar.contentId) ??
          fanslyScalarId(ar.mediaId) ??
          fanslyScalarId(ar.id) ??
          `${String(id)}_a_${ai}`,
        type,
        url,
        unlocked,
        ai,
      )
      return
    }

    pushMediaEntry(
      fanslyScalarId(amEnv?.id) ??
        fanslyScalarId(ar.contentId) ??
        fanslyScalarId(ar.mediaId) ??
        fanslyScalarId(ar.id) ??
        `${String(id)}_a_${ai}`,
      type,
      url,
      true,
      ai,
    )
  })

  const inlineMedia = Array.isArray(o.media) ? o.media : []
  inlineMedia.forEach((m, mi) => {
    const mr = digRecord(m)
    if (!mr) return
    const mid =
      fanslyScalarId(mr.id) ??
      fanslyScalarId(mr.mediaId) ??
      fanslyScalarId(mr.accountMediaId) ??
      fanslyScalarId(mr.attachmentId) ??
      `${String(id)}_m_${mi}`
    const type = inferFanslyBlobMediaType(mr)
    const url =
      pickFanslyMediaPresentationUrl(mr) ||
      (typeof mr.url === 'string'
        ? mr.url
        : typeof mr.src === 'string'
          ? mr.src
          : undefined) ||
      null
    pushMediaEntry(mid, type, url, true, attachments.length + mi)
  })

  const out: UnifiedThreadMessage = {
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

  if (previews.length > 0) out.previews = previews
  if (maxPpv > 0) {
    out.price = maxPpv
    out.isPaid = ppvUnlocks.length > 0 ? ppvUnlocks.every(Boolean) : false
  }

  return out
}

export function mapFanslyChatMessages(
  rows: unknown[],
  opts: { fanUserId: string; accountMedia?: Record<string, unknown>[] },
): UnifiedThreadMessage[] {
  const index =
    opts.accountMedia?.length ?? 0
      ? buildFanslyChatAccountMediaIndex(opts.accountMedia ?? [])
      : undefined
  const out: UnifiedThreadMessage[] = []
  for (const row of rows) {
    const m = mapFanslyChatRowToThreadMessage(row, { fanUserId: opts.fanUserId, accountMediaIndex: index })
    if (m) out.push(m)
  }
  return out
}
