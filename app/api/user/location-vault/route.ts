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
  if (error) return NextResponse.json({ error: 'Failed to load location settings' }, { status: 500 })

  return NextResponse.json({
    hasLocationSet: Boolean(profile?.has_location_set),
    locationHint: profile?.location_hint ?? null,
    locationUpdatedAt: profile?.location_updated_at ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { query?: string }
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (query.length < 2) {
    return NextResponse.json({ error: 'Please enter a valid location' }, { status: 400 })
  }

  const geocoded = await geocodeLocation(query)
  if (!geocoded) {
    return NextResponse.json(
      { error: 'Could not resolve that location. Try city + country.' },
      { status: 400 },
    )
  }

  const labelParts = [geocoded.name, geocoded.admin1, geocoded.country].filter(Boolean)
  const locationHint = labelParts.join(', ')
  const payload: StoredLocationPayload = {
    label: locationHint || geocoded.name,
    city: geocoded.name,
    country: geocoded.country,
    timezone: geocoded.timezone,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    source: 'manual',
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
    return NextResponse.json({ error: 'Failed to save location' }, { status: 500 })
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
  if (error) return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  return NextResponse.json({ ok: true, hasLocationSet: false })
}
