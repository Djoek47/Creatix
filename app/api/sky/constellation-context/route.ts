import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { resolveDecryptedObservationSite } from '@/lib/user/resolve-observation-site'
import { seededObservationLatLon } from '@/lib/stellar/seeded-location'

export type ConstellationSkyContext = {
  latitude: number
  longitude: number
  skySource: 'settings' | 'random_seed'
}

/** ~11 m resolution; keeps JSON tiny for repeat fetches. */
function roundCoord(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

const SKY_CACHE_HEADERS = {
  /** Client holds coords in memory + sessionStorage; skip HTTP caching to avoid stale coords after vault updates. */
  'Cache-Control': 'private, no-store',
}

function isLikelySessionCryptoFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('Unsupported state') ||
    msg.includes('unable to authenticate data') ||
    msg.includes('decryption operation failed')
  )
}

/**
 * Observation site for celestial projection (no decrypted address — only spherical coords).
 * Payload is two numbers + enum (bytes); location already stored server-side.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError) {
      console.warn('[sky/constellation-context] getUser:', authError.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const site = await resolveDecryptedObservationSite(supabase, user)
    if (site) {
      const body: ConstellationSkyContext = {
        latitude: roundCoord(site.latitude),
        longitude: roundCoord(site.longitude),
        skySource: 'settings',
      }
      return NextResponse.json(body, { headers: SKY_CACHE_HEADERS })
    }

    const { latitude, longitude } = seededObservationLatLon(`sky:${user.id}`)
    const body: ConstellationSkyContext = {
      latitude: roundCoord(latitude),
      longitude: roundCoord(longitude),
      skySource: 'random_seed',
    }
    return NextResponse.json(body, { headers: SKY_CACHE_HEADERS })
  } catch (e) {
    console.error('[sky/constellation-context]', e)
    if (isLikelySessionCryptoFailure(e)) {
      return NextResponse.json(
        { error: 'Session invalid or corrupt — sign out and back in, or clear site cookies.' },
        { status: 401 },
      )
    }
    return NextResponse.json({ error: 'Sky context unavailable' }, { status: 500 })
  }
}
