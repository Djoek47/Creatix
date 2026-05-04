/**
 * Fansly API Client
 * Integrates with ApiFansly.com for secure access to Fansly data
 * Documentation: https://docs.apifansly.com
 * Base URL: https://v1.apifansly.com
 */

import { formatFanslyUpstreamError, sanitizeFanslyPartnerMessage } from '@/lib/fansly/fansly-upstream-error'
import { finalizeFanslyPpvUsd } from '@/lib/fansly/ppv-send'
import {
  digRecord,
  extractFanslyChatAggregationAccounts,
  extractFanslyChatMessagesArray,
  extractFanslyChatsArray,
  extractFanslyChatsNextCursor,
  extractFanslyChatMessagesNextCursor,
  normalizeFanslyChatListItem,
} from '@/lib/messages/fansly-thread-map'

const FANSLY_API_BASE = 'https://v1.apifansly.com'

interface FanslyAPIOptions {
  accountId?: string
}

interface FanslyFan {
  id: string
  username: string
  displayName: string
  avatar: string
  subscribedAt: string
  expiresAt: string
  totalSpent: number
  subscriptionTier: string
}

interface FanslyEarnings {
  total: number
  subscriptions: number
  tips: number
  messages: number
  period: {
    start: string
    end: string
  }
}

/** Normalized for vault / OF-parity UI (`GET /api/fansly/vault-posts`). */
export type FanslyVaultFeedPost = {
  id: string
  text: string
  createdAt: string
  media: { id: string; type: string; url: string }[]
}

function fanslyTimestampToIso(ts: unknown): string {
  if (typeof ts === 'string' && ts.trim()) {
    const t = Date.parse(ts)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
    return new Date().toISOString()
  }
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    const ms = ts < 1e12 ? ts * 1000 : ts
    return new Date(ms).toISOString()
  }
  return new Date().toISOString()
}

function pickFanslyMediaUrl(m: Record<string, unknown>): string | null {
  const direct =
    typeof m.url === 'string'
      ? m.url
      : typeof m.src === 'string'
        ? m.src
        : typeof m.previewUrl === 'string'
          ? m.previewUrl
          : null
  if (direct?.trim()) return direct.trim()

  const loc = typeof m.location === 'string' ? m.location.trim() : ''
  if (loc && /^https?:\/\//i.test(loc)) return loc

  const variants = Array.isArray(m.variants) ? m.variants : []
  for (const v of variants) {
    const vr = digRecord(v)
    if (!vr) continue
    const locs = Array.isArray(vr.locations) ? vr.locations : []
    for (const L of locs) {
      const lr = digRecord(L)
      const u = typeof lr?.location === 'string' ? lr.location.trim() : ''
      if (u && /^https?:\/\//i.test(u)) return u
    }
  }
  return null
}

function inferFanslyMediaType(m: Record<string, unknown>): string {
  const t = String(m.type ?? m.mediaType ?? m.mimetype ?? '').toLowerCase()
  if (t.includes('video') || t.includes('mp4')) return 'video'
  return 'photo'
}

function extractFanslyPostsListPayload(raw: unknown): {
  posts: unknown[]
  accountMedia: unknown[]
} {
  const root = digRecord(raw)
  if (!root) return { posts: [], accountMedia: [] }
  const d0 = digRecord(root.data)
  if (!d0) return { posts: [], accountMedia: [] }
  const d1 = digRecord(d0.data)
  const resp = digRecord(d1?.response) ?? digRecord(d0.response)
  if (resp) {
    const posts = Array.isArray(resp.posts) ? resp.posts : []
    const accountMedia = Array.isArray(resp.accountMedia) ? resp.accountMedia : []
    return { posts, accountMedia }
  }
  const postsLegacy = Array.isArray(d0.posts) ? d0.posts : []
  return { posts: postsLegacy, accountMedia: [] }
}

function buildFanslyAccountMediaById(accountMedia: unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  for (const item of accountMedia) {
    const m = digRecord(item)
    if (!m || m.id == null) continue
    map.set(String(m.id), m)
  }
  return map
}

function mapFanslyPostToVaultFeed(
  post: unknown,
  mediaById: Map<string, Record<string, unknown>>,
): FanslyVaultFeedPost | null {
  const o = digRecord(post)
  if (!o || o.id == null) return null
  const id = String(o.id)
  const text =
    typeof o.content === 'string'
      ? o.content
      : typeof o.text === 'string'
        ? o.text
        : typeof o.body === 'string'
          ? o.body
          : ''
  const createdAt = fanslyTimestampToIso(o.createdAt ?? o.created_at)

  const mediaOut: { id: string; type: string; url: string }[] = []
  const seen = new Set<string>()

  const pushMedia = (mid: string, row: Record<string, unknown>) => {
    if (seen.has(mid)) return
    const url = pickFanslyMediaUrl(row)
    if (!url) return
    seen.add(mid)
    mediaOut.push({
      id: mid,
      type: inferFanslyMediaType(row),
      url,
    })
  }

  const attachments = Array.isArray(o.attachments) ? o.attachments : []
  for (const att of attachments) {
    const ar = digRecord(att)
    if (!ar) continue
    const midRaw = ar.mediaId ?? ar.accountMediaId ?? ar.id ?? ar.attachmentId
    if (midRaw == null) continue
    const mid = String(midRaw)
    const resolved = pickFanslyMediaUrl(ar) ? ar : mediaById.get(mid)
    if (resolved) pushMedia(mid, resolved)
  }

  const mediaIds = Array.isArray(o.mediaIds) ? o.mediaIds : []
  for (const midRaw of mediaIds) {
    if (midRaw == null) continue
    const mid = String(midRaw)
    const row = mediaById.get(mid)
    if (row) pushMedia(mid, row)
  }

  const inlineMedia = Array.isArray(o.media) ? o.media : []
  for (const m of inlineMedia) {
    const mr = digRecord(m)
    if (!mr || mr.id == null) continue
    pushMedia(String(mr.id), mr)
  }

  return { id, text, createdAt, media: mediaOut }
}

function extractFanslyNestedResponseRecord(raw: unknown): Record<string, unknown> | null {
  const root = digRecord(raw)
  const d0 = digRecord(root?.data)
  const d1 = digRecord(d0?.data)
  const r1 = d1?.response
  if (r1 && typeof r1 === 'object' && !Array.isArray(r1)) return r1 as Record<string, unknown>
  const r0 = d0?.response
  if (r0 && typeof r0 === 'object' && !Array.isArray(r0)) return r0 as Record<string, unknown>
  return null
}

function extractFanslyNestedResponseArray(raw: unknown): unknown[] {
  const root = digRecord(raw)
  const d0 = digRecord(root?.data)
  const d1 = digRecord(d0?.data)
  const r1 = d1?.response
  if (Array.isArray(r1)) return r1
  const r0 = d0?.response
  if (Array.isArray(r0)) return r0
  return []
}

function fanslyStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/** Depth-first string field (e.g. jobId, state, mediaId in nested ApiFansly envelopes). */
function findNestedStringValue(o: unknown, key: string): string | null {
  if (o == null) return null
  if (typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const v = r[key]
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v) && key === 'jobId') return String(v)
  for (const x of Object.values(r)) {
    const found = findNestedStringValue(x, key)
    if (found) return found
  }
  return null
}

function findNestedNumber(o: unknown, key: string): number | null {
  if (o == null) return null
  if (typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const v = r[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  for (const x of Object.values(r)) {
    const found = findNestedNumber(x, key)
    if (found != null) return found
  }
  return null
}

function pickFirstHttpsUrlInTree(o: unknown): string | null {
  if (typeof o === 'string' && /^https:\/\//i.test(o)) return o
  if (!o || typeof o !== 'object') return null
  for (const v of Object.values(o as Record<string, unknown>)) {
    const p = pickFirstHttpsUrlInTree(v)
    if (p) return p
  }
  return null
}

/** ApiFansly partner id stored in `platform_connections` — prefer documented `fansly_*` ids. */
function pickFanslyPartnerAccountId(data: Record<string, unknown>): string | undefined {
  const snake = fanslyStr(data.account_id)
  if (snake?.startsWith('fansly_')) return snake
  const camel = fanslyStr(data.accountId)
  if (camel?.startsWith('fansly_')) return camel
  return fanslyStr(data.account_id) ?? fanslyStr(data.accountId)
}

/**
 * Normalize POST /api/fansly/connect envelope (handles snake_case / camelCase and shallow nesting).
 */
function parseFanslyConnectEnvelope(envelope: unknown): {
  requires2fa: boolean
  twoFactorToken?: string
  maskedEmail?: string
  accountId?: string
  message?: string
} {
  const root = digRecord(envelope)
  const topMsg = fanslyStr(root.message)
  const data = digRecord(root.data)
  if (!data) {
    return { requires2fa: false, message: topMsg }
  }

  const nested = digRecord(data.data)
  const nestedResp = nested ? digRecord(nested.response) : null

  const rawRequires =
    data.requires_2fa === true ||
    data.requires2FA === true ||
    data.requires2fa === true

  const twoFactorToken =
    fanslyStr(data.twofa_token) ||
    fanslyStr(data.twoFactorToken) ||
    fanslyStr(data.twofaToken) ||
    (nestedResp ? fanslyStr(nestedResp.twofa_token) || fanslyStr(nestedResp.twoFactorToken) : undefined)

  const maskedEmail =
    fanslyStr(data.masked_email) ||
    fanslyStr(data.maskedEmail) ||
    (nestedResp ? fanslyStr(nestedResp.masked_email) || fanslyStr(nestedResp.maskedEmail) : undefined)

  const accountId = pickFanslyPartnerAccountId(data)

  const message =
    fanslyStr(data.message) ??
    (typeof data.error === 'string' ? data.error : undefined) ??
    topMsg

  return {
    requires2fa: Boolean(rawRequires && twoFactorToken),
    twoFactorToken,
    maskedEmail,
    accountId,
    message,
  }
}

function parseFanslyVerify2faEnvelope(envelope: unknown): {
  success: boolean
  accountId?: string
  message?: string
} {
  const root = digRecord(envelope)
  const topMsg = fanslyStr(root.message)
  const data = digRecord(root.data)
  if (!data) {
    return { success: false, message: topMsg ?? '2FA verification failed' }
  }
  const accountId = pickFanslyPartnerAccountId(data)
  if (accountId) {
    return { success: true, accountId, message: 'Connected successfully' }
  }
  const err =
    fanslyStr(data.message) ??
    (typeof data.error === 'string' ? data.error : undefined) ??
    topMsg
  return { success: false, message: err ?? '2FA verification failed' }
}

class FanslyAPI {
  private apiKey: string
  private accountId: string | null = null

  constructor(apiKey: string, options?: FanslyAPIOptions) {
    this.apiKey = apiKey
    this.accountId = options?.accountId || null
  }

  /**
   * JSON body for mutating methods; GET/HEAD must not send `Content-Type: application/json` (no body) —
   * some upstreams return 400 Bad Request otherwise.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase()
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      ...(options.headers as Record<string, string> | undefined),
    }
    if (!headers['Content-Type'] && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${FANSLY_API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    return this.parseFanslyJsonResponse<T>(response)
  }

  /** Multipart (e.g. media upload); do not set Content-Type — boundary is required. */
  private async requestMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${FANSLY_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
      body: formData,
    })
    return this.parseFanslyJsonResponse<T>(response)
  }

  private async requestGet<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${FANSLY_API_BASE}${endpoint}`, {
      method: 'GET',
      headers: { 'x-api-key': this.apiKey },
    })
    return this.parseFanslyJsonResponse<T>(response)
  }

  private async parseFanslyJsonResponse<T>(response: Response): Promise<T> {
    const text = await response.text()
    if (!response.ok) {
      const status = response.status
      const ct = response.headers.get('content-type') || ''
      let partner: string | undefined
      if (ct.includes('application/json')) {
        try {
          const j = JSON.parse(text) as { message?: unknown; error?: unknown }
          const m =
            typeof j.message === 'string'
              ? j.message
              : typeof j.error === 'string'
                ? j.error
                : undefined
          partner = sanitizeFanslyPartnerMessage(m)
        } catch {
          /* ignore */
        }
      }
      throw new Error(formatFanslyUpstreamError(status, partner))
    }

    if (!text.trim()) {
      return {} as T
    }
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error('Fansly API returned invalid JSON.')
    }
  }

  setAccountId(accountId: string) {
    this.accountId = accountId
  }

  // ============ ACCOUNTS ============

  /**
   * List all connected Fansly accounts for your API key
   * GET /api/fansly/accounts
   */
  async listAccounts(): Promise<{
    success: boolean
    count: number
    accounts: {
      accountId: string
      email: string
      name: string
      country: string
      createdAt: string
    }[]
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        success: boolean
        count: number
        accounts: {
          accountId: string
          email: string
          name: string
          country: string
          createdAt: string
        }[]
      }
    }>('/api/fansly/accounts')

    return response.data
  }

  /**
   * Get profile data for a specific account
   * GET /api/fansly/{accountId}/profile
   */
  async getProfile(accountId: string): Promise<{
    accountId: string
    username: string
    displayName: string
    avatar: string
    banner: string
    bio: string
    followersCount: number
    subscribersCount: number
    postsCount: number
    likesCount: number
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        accountId: string
        username: string
        displayName: string
        avatar: string
        banner: string
        bio: string
        followersCount: number
        subscribersCount: number
        postsCount: number
        likesCount: number
      }
    }>(`/api/fansly/${accountId}/profile`)

    return response.data
  }

  // ============ AUTHENTICATION ============

  /**
   * Connect a Fansly account with username/password
   * May return 2FA requirement
   * API Response format: { statusCode, message, data: { status_code, account_id, requires_2fa, twofa_token, ... } }
   */
  async connectAccount(
    username: string,
    password: string,
    countryCode: string = 'US',
    /** ApiFansly requires `name` on POST /api/fansly/connect */
    connectionName = 'Creatix',
  ): Promise<{
    success?: boolean
    account_id?: string
    requires_2fa?: boolean
    twoFactorToken?: string
    masked_email?: string
    message?: string
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        status_code: number
        account_id?: string
        requires_2fa?: boolean
        twofa_token?: string
        masked_email?: string
        message?: string
        data?: {
          success?: boolean
          response?: {
            accountId: string
            token: string
          }
        }
      }
    }>('/api/fansly/connect', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        name: connectionName,
        countryCode,
      }),
    })

    const parsed = parseFanslyConnectEnvelope(response)

    if (parsed.requires2fa && parsed.twoFactorToken) {
      return {
        requires_2fa: true,
        twoFactorToken: parsed.twoFactorToken,
        masked_email: parsed.maskedEmail,
        message: parsed.message || 'Two-factor authentication required',
      }
    }

    if (parsed.accountId) {
      return {
        success: true,
        account_id: parsed.accountId,
        message: 'Connected successfully',
      }
    }

    return {
      success: false,
      message:
        parsed.message ||
        fanslyStr((response as { message?: unknown }).message) ||
        'Connection failed',
    }
  }

  /**
   * Submit 2FA code to complete authentication
   * API endpoint: POST /api/fansly/verify-2fa
   */
  async submit2FA(
    username: string,
    password: string,
    twoFactorToken: string,
    twoFactorCode: string,
    name: string,
    countryCode: string = 'US'
  ): Promise<{
    success: boolean
    account_id?: string
    message?: string
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        status_code: number
        account_id?: string
        message?: string
        data?: {
          success?: boolean
          response?: {
            accountId: string
            token: string
          }
        }
      }
    }>('/api/fansly/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        twoFactorToken,
        twoFactorCode,
        name,
        countryCode,
      }),
    })

    const parsed = parseFanslyVerify2faEnvelope(response)
    if (parsed.success && parsed.accountId) {
      return {
        success: true,
        account_id: parsed.accountId,
        message: parsed.message || 'Connected successfully',
      }
    }

    return {
      success: false,
      message: parsed.message || '2FA verification failed',
    }
  }

  /**
   * Start email 2FA OTP session for an already-connected ApiFansly account (sensitive actions / payouts).
   * POST /api/fansly/{accountId}/twofa/session
   * @see https://docs.apifansly.com/api-reference/connect-fansly-account/send-otp
   */
  async startTwofaEmailSession(
    accountId: string,
    useEmailTwoFAFallback = true,
  ): Promise<{
    success: boolean
    emailTwofa?: { id: string; token: string; email: string; type: number }
    message?: string
  }> {
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data?: Record<string, unknown>
      }>(`/api/fansly/${encodeURIComponent(accountId)}/twofa/session`, {
        method: 'POST',
        body: JSON.stringify({ useEmailTwoFAFallback }),
      })

      const data = digRecord(response.data)
      const inner = digRecord(data?.data)
      const resp = digRecord(inner?.response)
      const et = digRecord(resp?.emailTwofa)
      const token = fanslyStr(et?.token)
      const id = et?.id != null ? String(et.id) : undefined
      if (token && id) {
        return {
          success: true,
          emailTwofa: {
            id,
            token,
            email: fanslyStr(et.email) ?? '',
            type: typeof et.type === 'number' && Number.isFinite(et.type) ? et.type : Number(et.type) || 2,
          },
        }
      }

      return {
        success: false,
        message:
          fanslyStr(data?.message) ||
          fanslyStr(response.message) ||
          'Failed to start 2FA session',
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start 2FA session',
      }
    }
  }

  /**
   * Verify OTP for a 2FA session started via {@link startTwofaEmailSession}.
   * POST /api/fansly/{accountId}/twofa/session/verify
   * @see https://docs.apifansly.com/api-reference/connect-fansly-account/verify-otp
   */
  async verifyTwofaSession(
    accountId: string,
    input: { token: string; code: string; mode?: number },
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await this.request(`/api/fansly/${encodeURIComponent(accountId)}/twofa/session/verify`, {
        method: 'POST',
        body: JSON.stringify({
          token: input.token,
          code: input.code,
          mode: input.mode ?? 1,
        }),
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'OTP verification failed',
      }
    }
  }

  // ============ ACCOUNT ============

  /**
   * Get account information
   */
  async getAccount(): Promise<{
    id: string
    username: string
    displayName: string
    avatar: string
    followersCount: number
    subscribersCount: number
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    return this.request(`/api/fansly/${this.accountId}/account`)
  }

  /**
   * Get account balance/earnings
   */
  async getBalance(): Promise<{
    balance: number
    pendingBalance: number
    currency: string
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    return this.request(`/api/fansly/${this.accountId}/balance`)
  }

  // ============ FANS & SUBSCRIBERS ============

  /**
   * Get list of fans/subscribers
   * Based on API docs: GET /api/fansly/{accountId}/subscribers
   */
  async getFans(accountId: string, params?: {
    status?: 'active' | 'expired' | 'all'
    limit?: number
    offset?: number
  }): Promise<{ 
    data: FanslyFan[]
    count: number 
  }> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    // Map status to the correct endpoint
    let endpoint = `/api/fansly/${accountId}/subscribers`
    if (params?.status === 'active') {
      endpoint = `/api/fansly/${accountId}/subscribers/active`
    } else if (params?.status === 'expired') {
      endpoint = `/api/fansly/${accountId}/subscribers/expired`
    }
    
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          count?: number
          subscribers?: FanslyFan[]
          data?: FanslyFan[]
        }
      }>(`${endpoint}?${query.toString()}`)
      
      return {
        data: response.data.subscribers || response.data.data || [],
        count: response.data.count || 0
      }
    } catch {
      // Return empty if endpoint not available
      return { data: [], count: 0 }
    }
  }

  /**
   * Get followers count
   * Based on profile data
   */
  async getFollowers(accountId: string, params?: {
    limit?: number
    offset?: number
  }): Promise<{ 
    data: { id: string; username: string; displayName: string; avatar: string }[]
    count: number 
  }> {
    // Use profile endpoint to get followers count
    try {
      const profile = await this.getProfile(accountId)
      return { 
        data: [], 
        count: profile.followersCount || 0 
      }
    } catch {
      return { data: [], count: 0 }
    }
  }

  // ============ EARNINGS ============

  /**
   * Get earnings summary
   * Based on API docs: GET /api/fansly/{accountId}/earnings/statistics
   */
  async getEarnings(accountId: string, params?: {
    startDate?: string
    endDate?: string
  }): Promise<FanslyEarnings> {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          total?: number
          subscriptions?: number
          tips?: number
          messages?: number
          period?: { start: string; end: string }
        }
      }>(`/api/fansly/${accountId}/earnings/statistics?${query.toString()}`)
      
      return {
        total: response.data.total || 0,
        subscriptions: response.data.subscriptions || 0,
        tips: response.data.tips || 0,
        messages: response.data.messages || 0,
        period: response.data.period || { start: '', end: '' }
      }
    } catch {
      return {
        total: 0,
        subscriptions: 0,
        tips: 0,
        messages: 0,
        period: { start: '', end: '' }
      }
    }
  }

  /**
   * Earnings transaction ledger (paginated).
   * GET /api/fansly/{accountId}/earnings/transactions
   */
  async listEarningsTransactions(
    accountId: string,
    params: { before?: number; after?: number; limit: number; offset: number },
  ): Promise<{ total: number; transactions: unknown[] }> {
    const q = new URLSearchParams()
    q.set('limit', String(params.limit))
    q.set('offset', String(params.offset))
    const nowMs = Date.now()
    // Docs: Unix ms. Partner returns 400 if `before` or `after` is in the future (client clock skew, stale URLs).
    let before = params.before != null ? Math.min(params.before, nowMs) : undefined
    let after = params.after != null ? Math.min(params.after, nowMs) : undefined
    // Docs show `before` + `after` together; some deployments reject `after` alone.
    if (after != null && before == null) {
      before = nowMs
    }
    // Upstream returns 400 if `after` >= `before` (client clock ahead of server, bad inputs, etc.).
    if (before != null && after != null && after >= before) {
      if (params.before == null && params.after != null) {
        before = undefined
        after = undefined
      } else {
        after = Math.min(after, before - 1)
      }
    }
    if (before != null) q.set('before', String(before))
    if (after != null) q.set('after', String(after))
    const raw = await this.requestGet<unknown>(
      `/api/fansly/${encodeURIComponent(accountId)}/earnings/transactions?${q.toString()}`,
    )
    const resp = extractFanslyNestedResponseRecord(raw)
    if (!resp) return { total: 0, transactions: [] }
    const transactions = Array.isArray(resp.data) ? resp.data : []
    const total = typeof resp.total === 'number' ? resp.total : transactions.length
    return { total, transactions }
  }

  /**
   * Monthly (and similar) earnings rollups for one fan account.
   * GET /api/fansly/{accountId}/earnings/fans/{fanId}
   */
  async listFanEarningsRollups(accountId: string, fanId: string): Promise<unknown[]> {
    const raw = await this.request<unknown>(
      `/api/fansly/${encodeURIComponent(accountId)}/earnings/fans/${encodeURIComponent(fanId)}`,
    )
    return extractFanslyNestedResponseArray(raw)
  }

  /**
   * Ranked supporters by lifetime spend (ApiFansly).
   * GET /api/fansly/{accountId}/top-supporters
   */
  async getTopSupporters(accountId: string, params?: { before?: number; after?: number }): Promise<unknown[]> {
    const q = new URLSearchParams()
    if (params?.before != null) q.set('before', String(params.before))
    if (params?.after != null) q.set('after', String(params.after))
    const qs = q.toString() ? `?${q.toString()}` : ''
    const raw = await this.request<unknown>(
      `/api/fansly/${encodeURIComponent(accountId)}/top-supporters${qs}`,
    )
    return extractFanslyNestedResponseArray(raw)
  }

  /**
   * Full follower list (IDs + aggregated account rows).
   * GET /api/fansly/{accountId}/followers
   */
  async listFollowersFull(accountId: string): Promise<{ followers: unknown[]; accounts: unknown[] }> {
    const raw = await this.request<unknown>(`/api/fansly/${encodeURIComponent(accountId)}/followers`)
    const resp = extractFanslyNestedResponseRecord(raw)
    if (!resp) return { followers: [], accounts: [] }
    const followers = Array.isArray(resp.followers) ? resp.followers : []
    const agg = digRecord(resp.aggregationData)
    const accounts = agg && Array.isArray(agg.accounts) ? agg.accounts : []
    return { followers, accounts }
  }

  // ============ POSTS ============

  /**
   * Create a new post
   * POST /api/fansly/{accountId}/posts
   */
  async createPost(accountId: string, data: {
    content: string
    wallIds?: string[]
    attachments?: any[]
    scheduledFor?: number
    expiresAt?: number
    fypFlags?: number
  }): Promise<{
    success: boolean
    postId?: string
    message?: string
  }> {
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          data: {
            success: boolean
            response: {
              id: string
              content: string
              createdAt: number
            }
          }
        }
      }>(`/api/fansly/${accountId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          content: data.content,
          wallIds: data.wallIds || [],
          fypFlags: data.fypFlags || 0,
          attachments: data.attachments || [],
          scheduledFor: data.scheduledFor || 0,
          expiresAt: data.expiresAt || 0,
          pinned: 0,
          pinWallIds: [],
        }),
      })

      return {
        success: response.data?.data?.success || false,
        postId: response.data?.data?.response?.id,
        message: response.message
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create post'
      }
    }
  }

  /**
   * List posts for the account (vault / library).
   * GET /api/fansly/{accountId}/posts — nested envelope per ApiFansly docs.
   */
  async listPosts(
    accountId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<{ posts: FanslyVaultFeedPost[]; total: number }> {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set('limit', String(params.limit))
    if (params?.offset != null) query.set('offset', String(params.offset))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const raw = await this.request<unknown>(`/api/fansly/${accountId}/posts${qs}`)
    const { posts: rawPosts, accountMedia } = extractFanslyPostsListPayload(raw)
    const mediaById = buildFanslyAccountMediaById(accountMedia)
    const posts: FanslyVaultFeedPost[] = []
    for (const p of rawPosts) {
      const row = mapFanslyPostToVaultFeed(p, mediaById)
      if (row) posts.push(row)
    }
    return { posts, total: posts.length }
  }

  /**
   * Delete a post.
   * DELETE /api/fansly/{accountId}/posts/{postId}
   */
  async deletePost(accountId: string, postId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const raw = await this.request<unknown>(
        `/api/fansly/${accountId}/posts/${encodeURIComponent(postId)}`,
        { method: 'DELETE' },
      )
      const root = digRecord(raw)
      const d0 = digRecord(root?.data)
      const d1 = digRecord(d0?.data)
      const success = d1?.success === true || d0?.success === true
      return {
        success: Boolean(success),
        message: typeof root?.message === 'string' ? root.message : undefined,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete post',
      }
    }
  }

  /**
   * Get wall IDs for posting (needed for createPost)
   * GET /api/fansly/{accountId}/walls
   */
  async getWalls(accountId: string): Promise<{
    walls: { id: string; name: string }[]
  }> {
    try {
      const raw = await this.request<unknown>(`/api/fansly/${accountId}/walls`)
      const root = digRecord(raw)
      const d0 = digRecord(root?.data)
      const d1 = digRecord(d0?.data)
      const resp = digRecord(d1?.response) ?? digRecord(d0?.response)
      let list: unknown[] = []
      if (resp && Array.isArray(resp.walls)) list = resp.walls
      else if (d0 && Array.isArray(d0.walls)) list = d0.walls
      else if (d1 && Array.isArray(d1.walls)) list = d1.walls

      const walls = list
        .map((w) => {
          const wr = digRecord(w)
          if (!wr || wr.id == null) return null
          return { id: String(wr.id), name: typeof wr.name === 'string' ? wr.name : '' }
        })
        .filter((x): x is { id: string; name: string } => x != null)
      return { walls }
    } catch {
      return { walls: [] }
    }
  }

  // ============ MESSAGES ============

  /**
   * Get chat conversations (ApiFansly List Chats).
   * Upstream accepts **only** `cursor` (never `limit` / `offset`). Those are applied client-side.
   * @see https://docs.apifansly.com/api-reference/chats/list-chats
   */
  async getChats(params?: {
    limit?: number
    offset?: number
    /** Starting cursor for the first upstream request (omit for first page). */
    cursor?: string | number
    /**
     * One `GET …/chats` only — matches vendor pagination (pass returned `nextCursor` as `cursor` for the next call).
     * When false/omitted, we may walk multiple pages until `offset+limit` items are merged.
     */
    singlePage?: boolean
  }): Promise<{
    data: {
      id: string
      user: { id: string; username: string; displayName: string; avatar: string }
      lastMessage: string
      unreadCount: number
      updatedAt: string
    }[]
    total: number
    nextCursor?: string | null
    /** Partner exposes another page after this response. */
    hasMore?: boolean
  }> {
    if (!this.accountId) throw new Error('Account ID not set')

    const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200)
    const offset = Math.max(params?.offset ?? 0, 0)
    const targetEnd = offset + limit

    type ChatRow = {
      id: string
      user: { id: string; username: string; displayName: string; avatar: string }
      lastMessage: string
      unreadCount: number
      updatedAt: string
    }

    const normalizeListChatsPage = (raw: unknown): { items: ChatRow[]; nextCursor: string | undefined } => {
      const rows = extractFanslyChatsArray(raw)
      const accounts = extractFanslyChatAggregationAccounts(raw)
      const byId = new Map<string, Record<string, unknown>>()
      for (const a of accounts) {
        const id = a.id != null ? String(a.id) : ''
        if (id) byId.set(id, a)
      }
      const items: ChatRow[] = []
      for (const row of rows) {
        const n = normalizeFanslyChatListItem(row, byId)
        if (n) items.push(n)
      }
      return { items, nextCursor: extractFanslyChatsNextCursor(raw) ?? undefined }
    }

    let startCursor: string | undefined =
      params?.cursor != null && String(params.cursor).trim() !== ''
        ? String(params.cursor).trim()
        : undefined

    if (params?.singlePage) {
      const q = new URLSearchParams()
      if (startCursor) q.set('cursor', startCursor)
      const qs = q.toString()
      const path = `/api/fansly/${encodeURIComponent(this.accountId)}/chats${qs ? `?${qs}` : ''}`
      const raw = await this.requestGet<unknown>(path)
      const { items, nextCursor } = normalizeListChatsPage(raw)
      const data = items.slice(0, limit)
      return {
        data,
        total: items.length,
        nextCursor: nextCursor ?? null,
        hasMore: Boolean(nextCursor),
      }
    }

    const merged: ChatRow[] = []
    let cursor = startCursor
    let lastNext: string | undefined
    let prevCursor: string | undefined

    for (let page = 0; page < 40 && merged.length < targetEnd; page++) {
      const q = new URLSearchParams()
      if (cursor) q.set('cursor', cursor)
      const qs = q.toString()
      const path = `/api/fansly/${encodeURIComponent(this.accountId)}/chats${qs ? `?${qs}` : ''}`
      let raw: unknown
      try {
        raw = await this.requestGet<unknown>(path)
      } catch (err) {
        // First page must surface errors; later pages can fail on cursor quirks — keep what we fetched.
        if (page > 0 && merged.length > 0) break
        throw err
      }

      const { items, nextCursor } = normalizeListChatsPage(raw)
      merged.push(...items)

      lastNext = nextCursor
      if (!lastNext || items.length === 0) break
      if (lastNext === prevCursor || lastNext === cursor) break
      prevCursor = cursor
      cursor = lastNext
    }

    return {
      data: merged.slice(offset, targetEnd),
      total: merged.length,
      nextCursor: lastNext ?? null,
      hasMore: Boolean(lastNext),
    }
  }

  /**
   * Get messages in a chat (ApiFansly List Chat Messages).
   * Upstream allows only `cursor` and `limit` (1–10 per request). We never send `before`.
   * @see https://docs.apifansly.com/api-reference/chat-messages/list-chat-messages
   */
  async getMessages(chatId: string, params?: {
    limit?: number
    /** Alias for upstream `cursor` (older messages). */
    before?: string
    cursor?: string
  }): Promise<{ data: unknown[] }> {
    if (!this.accountId) throw new Error('Account ID not set')

    const wantTotal = Math.min(Math.max(params?.limit ?? 100, 1), 200)
    const pageLimit = 10 // vendor max
    const startCursor =
      (params?.cursor != null && String(params.cursor).trim() !== ''
        ? String(params.cursor).trim()
        : undefined) ??
      (params?.before != null && String(params.before).trim() !== ''
        ? String(params.before).trim()
        : undefined)

    const merged: unknown[] = []
    let cursor: string | undefined = startCursor
    let prevCursor: string | undefined

    for (let page = 0; page < 40 && merged.length < wantTotal; page++) {
      const q = new URLSearchParams()
      q.set('limit', String(pageLimit))
      if (cursor) q.set('cursor', cursor)
      const qs = q.toString()
      const path = `/api/fansly/${encodeURIComponent(this.accountId)}/chats/${encodeURIComponent(chatId)}/messages?${qs}`

      let raw: unknown
      try {
        raw = await this.requestGet<unknown>(path)
      } catch (err) {
        if (page > 0 && merged.length > 0) break
        throw err
      }

      const batch = extractFanslyChatMessagesArray(raw)
      merged.push(...batch)

      const next = extractFanslyChatMessagesNextCursor(raw)
      if (!next || batch.length === 0) break
      if (next === prevCursor || next === cursor) break
      prevCursor = cursor
      cursor = next
    }

    return { data: merged.slice(0, wantTotal) }
  }

  /**
   * Send a message
   * @see https://docs.apifansly.com/api-reference/chat-messages/send-message
   * Upstream expects `content` (not `text`), optional singular `mediaId`, and for PPV: `access_type: "ppv"` + `price` (USD).
   */
  async sendMessage(accountId: string, chatId: string, data: {
    text: string
    mediaIds?: string[]
    /** PPV / paid message amount when supported by upstream. */
    price?: number
  }): Promise<Record<string, unknown>> {
    const content = typeof data.text === 'string' ? data.text : ''
    const mediaIds = (data.mediaIds ?? []).map((id) => String(id).trim()).filter(Boolean)
    const rawPrice =
      typeof data.price === 'number' && Number.isFinite(data.price) && data.price > 0 ? data.price : undefined

    const body: Record<string, unknown> = { content }
    if (mediaIds.length > 0) {
      body.mediaId = mediaIds[0]
    }
    /**
     * PPV: `mediaId` + `access_type: "ppv"` + `price` (USD). Vendor minimum $1 — callers must validate;
     * we still guard here so partial cents round safely within bounds.
     */
    if (mediaIds.length > 0 && rawPrice != null && rawPrice >= 1) {
      body.access_type = 'ppv'
      body.price = finalizeFanslyPpvUsd(rawPrice)
    }

    const raw = await this.request<unknown>(
      `/api/fansly/${encodeURIComponent(accountId)}/chats/${encodeURIComponent(chatId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
    const root = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
    const d0 =
      root.data && typeof root.data === 'object' && !Array.isArray(root.data)
        ? (root.data as Record<string, unknown>)
        : {}
    const d1 =
      d0.data && typeof d0.data === 'object' && !Array.isArray(d0.data)
        ? (d0.data as Record<string, unknown>)
        : {}
    const resp =
      d1.response && typeof d1.response === 'object' && !Array.isArray(d1.response)
        ? (d1.response as Record<string, unknown>)
        : {}
    const msg =
      resp.message && typeof resp.message === 'object' && !Array.isArray(resp.message)
        ? (resp.message as Record<string, unknown>)
        : resp.id != null || resp.text != null
          ? resp
          : d1.id != null || d1.text != null
            ? d1
            : d0
    return (msg && typeof msg === 'object' ? msg : {}) as Record<string, unknown>
  }

  /**
   * Queue vault/media upload; returns background job id.
   * @see https://docs.apifansly.com/api-reference/media/upload-media
   */
  async initiateMediaUpload(accountId: string, file: Blob, fileName: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', file, fileName || 'upload.bin')
    const raw = await this.requestMultipart<unknown>(
      `/api/fansly/${encodeURIComponent(accountId)}/media/upload`,
      fd,
    )
    const jobId = findNestedStringValue(raw, 'jobId')
    if (!jobId) throw new Error('Fansly upload did not return a job id.')
    return jobId
  }

  /**
   * Poll upload job (global path — no account id in URL).
   * @see https://docs.apifansly.com/api-reference/media/upload-media
   */
  async getMediaUploadJobStatus(jobId: string): Promise<{
    state: string
    progress: number
    mediaId?: string
    errorMessage?: string
    previewUrl?: string
    mimeType?: string
  }> {
    const raw = await this.requestGet<unknown>(`/api/fansly/media/upload/${encodeURIComponent(jobId)}/status`)
    const state = (findNestedStringValue(raw, 'state') || 'unknown').toLowerCase()
    const progress = findNestedNumber(raw, 'progress') ?? 0
    const mediaId = findNestedStringValue(raw, 'mediaId') || undefined
    const errorMessage =
      findNestedStringValue(raw, 'error') ||
      (state === 'failed' ? findNestedStringValue(raw, 'message') : null) ||
      undefined
    const previewUrl = mediaId ? pickFirstHttpsUrlInTree(raw) : undefined
    const mimeType = findNestedStringValue(raw, 'mimetype') || findNestedStringValue(raw, 'mimeType') || undefined
    return { state, progress, mediaId, errorMessage, previewUrl: previewUrl || undefined, mimeType }
  }

  /** Initiate upload and poll until `completed` or timeout. */
  async uploadMediaWait(
    accountId: string,
    file: Blob,
    fileName: string,
    opts?: { timeoutMs?: number; pollMs?: number },
  ): Promise<{ id: string; url?: string; type?: string }> {
    const jobId = await this.initiateMediaUpload(accountId, file, fileName)
    /** Default aligned with `maxDuration` on `POST /api/fansly/media/upload` (leave headroom for initiate + download). */
    const timeoutMs = opts?.timeoutMs ?? 120_000
    const pollMs = opts?.pollMs ?? 1_500
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const st = await this.getMediaUploadJobStatus(jobId)
      if (st.state === 'completed' && st.mediaId) {
        return { id: st.mediaId, url: st.previewUrl, type: st.mimeType }
      }
      if (st.state === 'failed' || st.state === 'error') {
        throw new Error(st.errorMessage || 'Fansly media processing failed.')
      }
      await new Promise((r) => setTimeout(r, pollMs))
    }
    throw new Error('Fansly media upload timed out.')
  }

  /**
   * Send mass message to all subscribers
   * POST /api/fansly/{accountId}/messages/mass
   */
  async sendMassMessage(accountId: string, data: {
    content: string
    mediaIds?: string[]
    price?: number
    subscriberFilter?: 'all' | 'active' | 'expired' | 'renewing'
  }): Promise<{ 
    success: boolean
    sent?: number
    failed?: number
    message?: string 
  }> {
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          success: boolean
          sent?: number
          failed?: number
        }
      }>(`/api/fansly/${accountId}/messages/mass`, {
        method: 'POST',
        body: JSON.stringify({
          content: data.content,
          mediaIds: data.mediaIds || [],
          price: data.price || 0,
          filter: data.subscriberFilter || 'all',
        }),
      })

      return {
        success: response.data.success,
        sent: response.data.sent,
        failed: response.data.failed,
        message: response.message
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send mass message'
      }
    }
  }
}

// Factory function to create API instance
export function createFanslyAPI(accountId?: string): FanslyAPI {
  const apiKey = process.env.FANSLY_API_KEY
  if (!apiKey) {
    throw new Error('FANSLY_API_KEY environment variable is not set')
  }
  return new FanslyAPI(apiKey, { accountId })
}

export type { FanslyFan, FanslyEarnings }
export { FanslyAPI }
