import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { encryptLocationPayload, type StoredLocationPayload } from '@/lib/location-vault'

type GeocodeResult = {
  name: string
  country?: string
  admin1?: string
  timezone?: string
  latitude: number
  longitude: number
}

type LocationVaultFallback = {
  encrypted: string
  hint: string
  updatedAt: string
  timezone?: string | null
}

function parseLocationFallback(raw: unknown): LocationVaultFallback | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.encrypted !== 'string' || typeof row.hint !== 'string' || typeof row.updatedAt !== 'string') {
    return null
  }
  return {
    encrypted: row.encrypted,
    hint: row.hint,
    updatedAt: row.updatedAt,
    timezone: typeof row.timezone === 'string' ? row.timezone : null,
  }
}

async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
  const first = data.results?.[0]
  if (!first) return null
  const latitude = Number(first.latitude)
  const longitude = Number(first.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    name: String(first.name ?? query),
    country: first.country ? String(first.country) : undefined,
    admin1: first.admin1 ? String(first.admin1) : undefined,
    timezone: first.timezone ? String(first.timezone) : undefined,
    latitude,
    longitude,
  }
}

async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
  const first = data.results?.[0]
  if (!first) return null
  const lat = Number(first.latitude ?? latitude)
  const lon = Number(first.longitude ?? longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return {
    name: String(first.name ?? 'Current location'),
    country: first.country ? String(first.country) : undefined,
    admin1: first.admin1 ? String(first.admin1) : undefined,
    timezone: first.timezone ? String(first.timezone) : undefined,
    latitude: lat,
    longitude: lon,
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('has_location_set, location_hint, location_updated_at')
    .eq('id', user.id)
    .maybeSingle()
  if (!error) {
    return NextResponse.json({
      hasLocationSet: Boolean(profile?.has_location_set),
      locationHint: profile?.location_hint ?? null,
      locationUpdatedAt: profile?.location_updated_at ?? null,
    })
  }

  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fallback = parseLocationFallback(userMeta.location_vault)
  if (!fallback) return NextResponse.json({ error: 'Failed to load location settings' }, { status: 500 })

  return NextResponse.json({
    hasLocationSet: true,
    locationHint: fallback.hint,
    locationUpdatedAt: fallback.updatedAt,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    query?: string
    latitude?: number
    longitude?: number
    label?: string
    source?: StoredLocationPayload['source']
  }
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
  if (!hasCoordinates && query.length < 2) {
    return NextResponse.json({ error: 'Please choose a valid location' }, { status: 400 })
  }

  const geocoded = hasCoordinates
    ? await reverseGeocodeLocation(latitude, longitude)
    : await geocodeLocation(query)
  if (!geocoded) {
    return NextResponse.json(
      { error: 'Could not resolve that location. Try another place.' },
      { status: 400 },
    )
  }

  const labelParts = [geocoded.name, geocoded.admin1, geocoded.country].filter(Boolean)
  const locationHint = labelParts.join(', ')
  const payload: StoredLocationPayload = {
    label:
      typeof body.label === 'string' && body.label.trim().length > 0
        ? body.label.trim()
        : locationHint || geocoded.name,
    city: geocoded.name,
    country: geocoded.country,
    timezone: geocoded.timezone,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    source:
      body.source === 'geolocation' || body.source === 'preset' || body.source === 'manual'
        ? body.source
        : hasCoordinates
          ? 'geolocation'
          : 'manual',
    savedAt: new Date().toISOString(),
  }

  const encrypted = encryptLocationPayload(user.id, payload)
  const update: Record<string, unknown> = {
    encrypted_location: encrypted,
    has_location_set: true,
    location_hint: locationHint || geocoded.name,
    location_updated_at: new Date().toISOString(),
  }
  if (geocoded.timezone) {
    update.timezone = geocoded.timezone
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) {
    // Fallback for environments where migration columns are not yet present.
    const mergedMeta = {
      ...(user.user_metadata ?? {}),
      location_vault: {
        encrypted,
        hint: update.location_hint,
        updatedAt: update.location_updated_at,
        timezone: geocoded.timezone ?? null,
      },
    }
    const { error: authError } = await supabase.auth.updateUser({
      data: mergedMeta,
    })
    if (authError) {
      return NextResponse.json({ error: 'Failed to save location' }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    hasLocationSet: true,
    locationHint: update.location_hint,
    timezone: geocoded.timezone ?? null,
  })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({
      encrypted_location: null,
      has_location_set: false,
      location_hint: null,
      location_updated_at: null,
    })
    .eq('id', user.id)
  if (error) {
    const mergedMeta = { ...(user.user_metadata ?? {}) } as Record<string, unknown>
    delete mergedMeta.location_vault
    const { error: authError } = await supabase.auth.updateUser({ data: mergedMeta })
    if (authError) return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, hasLocationSet: false })
}
