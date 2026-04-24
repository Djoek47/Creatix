type RateWindowState = {
  limitPerMinute: number
  remainingMinute: number | null
  resetAtMs: number | null
}

type RequestPolicyInput = {
  url: string
  init: RequestInit
  accountId?: string | null
  timeoutMs?: number
  maxRetries?: number
}

const DEFAULT_LIMIT_PER_MINUTE = Number(process.env.ONLYFANS_RATE_LIMIT_PER_MINUTE || 1000)
const DEFAULT_MAX_RETRIES = Number(process.env.ONLYFANS_MAX_RETRIES || 3)
const DEFAULT_TIMEOUT_MS = Number(process.env.ONLYFANS_REQUEST_TIMEOUT_MS || 8000)
const DEFAULT_GLOBAL_CONCURRENCY = Number(process.env.ONLYFANS_GLOBAL_MAX_CONCURRENCY || 40)
const DEFAULT_GLOBAL_SAFETY_RPS = Number(process.env.ONLYFANS_GLOBAL_SAFETY_RPS || 90)

const perAccountWindow = new Map<string, RateWindowState>()
const globalCallTimestamps: number[] = []

let inflight = 0
const waitQueue: Array<() => void> = []

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowMs() {
  return Date.now()
}

function parseRateHeaders(res: Response): Partial<RateWindowState> {
  const h = res.headers
  const limitHeader = h.get('x-rate-limit-limit-minute')
  const remainingHeader = h.get('x-rate-limit-remaining-minute')
  const resetHeader = h.get('x-rate-limit-reset-minute')
  const retryAfter = h.get('retry-after')

  const out: Partial<RateWindowState> = {}
  const limitNum = Number(limitHeader)
  if (Number.isFinite(limitNum) && limitNum > 0) out.limitPerMinute = limitNum

  const remNum = Number(remainingHeader)
  if (Number.isFinite(remNum) && remNum >= 0) out.remainingMinute = remNum

  const resetNum = Number(resetHeader)
  if (Number.isFinite(resetNum) && resetNum > 0) out.resetAtMs = resetNum * 1000

  const retryNum = Number(retryAfter)
  if (Number.isFinite(retryNum) && retryNum > 0) {
    const candidate = nowMs() + retryNum * 1000
    if (!out.resetAtMs || candidate > out.resetAtMs) out.resetAtMs = candidate
  }
  return out
}

function normalizedAccountKey(accountId?: string | null): string {
  return accountId && accountId.trim() ? accountId.trim() : '__global__'
}

function getAccountState(accountId?: string | null): RateWindowState {
  const key = normalizedAccountKey(accountId)
  const prev = perAccountWindow.get(key)
  if (prev) return prev
  const initial: RateWindowState = {
    limitPerMinute: DEFAULT_LIMIT_PER_MINUTE,
    remainingMinute: null,
    resetAtMs: null,
  }
  perAccountWindow.set(key, initial)
  return initial
}

function updateAccountState(accountId: string | null | undefined, res: Response) {
  const key = normalizedAccountKey(accountId)
  const prev = getAccountState(accountId)
  const nextHdr = parseRateHeaders(res)
  const next: RateWindowState = {
    limitPerMinute: nextHdr.limitPerMinute ?? prev.limitPerMinute,
    remainingMinute: nextHdr.remainingMinute ?? prev.remainingMinute,
    resetAtMs: nextHdr.resetAtMs ?? prev.resetAtMs,
  }
  perAccountWindow.set(key, next)
}

async function acquireGlobalConcurrencySlot() {
  while (inflight >= DEFAULT_GLOBAL_CONCURRENCY) {
    await new Promise<void>((resolve) => waitQueue.push(resolve))
  }
  inflight += 1
}

function releaseGlobalConcurrencySlot() {
  inflight = Math.max(0, inflight - 1)
  const next = waitQueue.shift()
  if (next) next()
}

async function enforceGlobalRpsSafety() {
  const now = nowMs()
  const windowStart = now - 1000
  while (globalCallTimestamps.length && globalCallTimestamps[0] < windowStart) {
    globalCallTimestamps.shift()
  }
  if (globalCallTimestamps.length < DEFAULT_GLOBAL_SAFETY_RPS) return
  const oldest = globalCallTimestamps[0]
  const waitMs = Math.max(5, 1000 - (now - oldest))
  await sleep(waitMs)
}

async function enforcePerAccountPacing(accountId?: string | null) {
  const state = getAccountState(accountId)
  const limit = Math.max(1, state.limitPerMinute)
  const minSpacingMs = Math.ceil(60000 / limit)
  const key = `ts:${normalizedAccountKey(accountId)}`
  const holder = (globalThis as typeof globalThis & { __ofLastCallByAccount?: Record<string, number> })
  if (!holder.__ofLastCallByAccount) holder.__ofLastCallByAccount = {}
  const last = holder.__ofLastCallByAccount[key] ?? 0
  const elapsed = nowMs() - last
  if (elapsed < minSpacingMs) {
    await sleep(minSpacingMs - elapsed)
  }
  holder.__ofLastCallByAccount[key] = nowMs()
}

function parseRetryAfterMs(res: Response): number | null {
  const raw = res.headers.get('retry-after')
  if (!raw) return null
  const num = Number(raw)
  if (Number.isFinite(num) && num >= 0) return num * 1000
  const dateMs = Date.parse(raw)
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - nowMs())
  return null
}

function computeBackoffMs(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs != null) return Math.max(250, retryAfterMs)
  const base = Math.min(8000, 500 * 2 ** attempt)
  const jitter = Math.floor(Math.random() * 300)
  return base + jitter
}

function shouldRetry(status: number): boolean {
  return status === 429 || status === 408 || status === 500 || status === 502 || status === 503 || status === 504
}

export async function onlyFansRequestWithPolicy({
  url,
  init,
  accountId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
}: RequestPolicyInput): Promise<Response> {
  let attempt = 0
  while (true) {
    await enforceGlobalRpsSafety()
    await acquireGlobalConcurrencySlot()
    await enforcePerAccountPacing(accountId)
    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: ac.signal })
      globalCallTimestamps.push(nowMs())
      updateAccountState(accountId, res)
      if (!shouldRetry(res.status) || attempt >= maxRetries) {
        return res
      }
      const waitMs = computeBackoffMs(attempt, parseRetryAfterMs(res))
      attempt += 1
      await sleep(waitMs)
      continue
    } catch (error) {
      if (attempt >= maxRetries) throw error
      const waitMs = computeBackoffMs(attempt, null)
      attempt += 1
      await sleep(waitMs)
    } finally {
      clearTimeout(timeout)
      releaseGlobalConcurrencySlot()
    }
  }
}
