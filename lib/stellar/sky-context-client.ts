/**
 * Observation coords for celestial backdrop — designed for **one network fetch per tab** (then memory only).
 * `sessionStorage` warms hydration; in-memory avoids even re-reading storage on each component.
 */

export type SkyCanvasContext = {
  latitude: number
  longitude: number
  skySource: 'settings' | 'random_seed'
}

const STORAGE_KEY = 'creatix.skyCtx.v1'

/** Resolved once until clear — all reads go here first */
let resolvedSkyCtx: SkyCanvasContext | null = null

let inflight: Promise<SkyCanvasContext> | null = null

function parseStored(raw: string | null): SkyCanvasContext | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<SkyCanvasContext>
    if (
      typeof o.latitude !== 'number' ||
      typeof o.longitude !== 'number' ||
      (o.skySource !== 'settings' && o.skySource !== 'random_seed')
    ) {
      return null
    }
    return {
      latitude: o.latitude,
      longitude: o.longitude,
      skySource: o.skySource,
    }
  } catch {
    return null
  }
}

function rememberSky(ctx: SkyCanvasContext): void {
  resolvedSkyCtx = ctx
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
  } catch {
    /* quota / private mode */
  }
}

export function readSessionSkyCache(): SkyCanvasContext | null {
  if (typeof window === 'undefined') return null
  if (resolvedSkyCtx) return resolvedSkyCtx
  const parsed = parseStored(sessionStorage.getItem(STORAGE_KEY))
  if (parsed) resolvedSkyCtx = parsed
  return resolvedSkyCtx
}

/** Call after user updates or removes encrypted location so the next sky read refetches. */
export function clearSessionSkyContextCache(): void {
  if (typeof window === 'undefined') return
  resolvedSkyCtx = null
  inflight = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}

/**
 * At most **one** GET per tab lifetime (until `clearSessionSkyContextCache`).
 * Subsequent calls synchronously reuse `resolvedSkyCtx`; parallel callers share one `inflight`.
 */
export function loadSkyContextForCanvas(): Promise<SkyCanvasContext> {
  const hit = readSessionSkyCache()
  if (hit) return Promise.resolve(hit)

  inflight ??= (async () => {
    const init: RequestInit & { priority?: 'high' | 'low' | 'auto' } = {
      credentials: 'include',
      cache: 'force-cache',
      priority: 'low',
    }
    const res = await fetch('/api/sky/constellation-context', init)
    if (!res.ok) {
      throw new Error(`sky context ${res.status}`)
    }
    const raw = (await res.json()) as SkyCanvasContext & { error?: unknown }
    if (typeof raw.latitude !== 'number' || typeof raw.longitude !== 'number') {
      throw new Error('sky context malformed')
    }
    const ctx: SkyCanvasContext = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      skySource: raw.skySource === 'settings' ? 'settings' : 'random_seed',
    }
    rememberSky(ctx)
    return ctx
  })().finally(() => {
    inflight = null
  })

  return inflight
}
