import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { decryptLocationPayload } from '@/lib/location-vault'
import { fetchOpenMeteoAqi, fetchOpenMeteoForecast } from '@/lib/wellbeing/open-meteo'
import { computeGlowScore, scoreReason, skyGradientFromScore } from '@/lib/wellbeing/glow-score'
import { azimuthToCompass, buildGoldenHourWindow, minutesUntil, sunsetAzimuth } from '@/lib/wellbeing/golden-hour'
import type { GlowInsightsPayload, PerfectShotDay } from '@/lib/wellbeing/types'

function pickHourlyByDate<T>(hourlyTimes: string[], values: T[], targetIso: string): T | null {
  const target = new Date(targetIso).getTime()
  let closestIndex = -1
  let closestDelta = Number.MAX_SAFE_INTEGER
  for (let i = 0; i < hourlyTimes.length; i += 1) {
    const d = Math.abs(new Date(hourlyTimes[i]).getTime() - target)
    if (d < closestDelta) {
      closestDelta = d
      closestIndex = i
    }
  }
  return closestIndex >= 0 ? values[closestIndex] : null
}

function humanTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function nearestAqiValue(byIsoTime: Map<string, number>, targetIso: string): number | null {
  if (byIsoTime.size === 0) return null
  if (byIsoTime.has(targetIso)) return byIsoTime.get(targetIso) ?? null
  const target = new Date(targetIso).getTime()
  let picked: number | null = null
  let delta = Number.MAX_SAFE_INTEGER
  for (const [iso, value] of byIsoTime.entries()) {
    const d = Math.abs(new Date(iso).getTime() - target)
    if (d < delta) {
      delta = d
      picked = value
    }
  }
  return picked
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('encrypted_location, has_location_set, location_hint')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.has_location_set || !profile?.encrypted_location) {
      return NextResponse.json(
        { error: 'Location not set. Add your location in Settings to enable glow insights.' },
        { status: 404 },
      )
    }

    const location = decryptLocationPayload(user.id, String(profile.encrypted_location))
    const [forecast, aqi] = await Promise.all([
      fetchOpenMeteoForecast(location.latitude, location.longitude),
      fetchOpenMeteoAqi(location.latitude, location.longitude),
    ])
    if (!forecast.daily?.sunset?.length || !forecast.daily?.sunrise?.length) {
      return NextResponse.json({ error: 'Forecast data unavailable for this location' }, { status: 502 })
    }

    const now = Date.now()
    const windows = forecast.daily.sunset.map((sunsetIso) => buildGoldenHourWindow(sunsetIso))
    const nextGolden = windows.find((w) => new Date(w.endIso).getTime() > now) ?? windows[0]

    const perfectShotDays: PerfectShotDay[] = forecast.daily.time.slice(0, 5).map((date, index) => {
      const sunsetIso = forecast.daily.sunset[index]
      const window = buildGoldenHourWindow(sunsetIso)
      const cloudCover = Number(
        pickHourlyByDate(forecast.hourly.time, forecast.hourly.cloud_cover, sunsetIso) ?? 55,
      )
      const humidity = Number(
        pickHourlyByDate(forecast.hourly.time, forecast.hourly.relative_humidity_2m, sunsetIso) ?? 55,
      )
      const visibilityMeters = Number(
        pickHourlyByDate(forecast.hourly.time, forecast.hourly.visibility, sunsetIso) ?? 10000,
      )
      const visibilityKm = Math.round((visibilityMeters / 1000) * 10) / 10
      const aqiAtSunset = nearestAqiValue(aqi.byIsoTime, sunsetIso)
      const score = computeGlowScore({
        cloudCover,
        humidity,
        visibilityKm,
        aqi: aqiAtSunset,
      })
      return {
        date,
        dayLabel: new Date(date).toLocaleDateString([], { weekday: 'short' }),
        score,
        bestWindowStart: humanTime(window.startIso),
        bestWindowEnd: humanTime(window.endIso),
        reason: scoreReason(score, cloudCover),
        skyGradient: skyGradientFromScore(score),
        cloudCover,
        humidity,
        visibilityKm,
      }
    })

    const topDay = [...perfectShotDays].sort((a, b) => b.score - a.score)[0]
    const nextSunsetIso = nextGolden?.sunsetIso ?? forecast.daily.sunset[0]
    const nextCloud = Number(
      pickHourlyByDate(forecast.hourly.time, forecast.hourly.cloud_cover, nextSunsetIso) ?? 50,
    )
    const nextHumidity = Number(
      pickHourlyByDate(forecast.hourly.time, forecast.hourly.relative_humidity_2m, nextSunsetIso) ?? 55,
    )
    const nextVisibilityM = Number(
      pickHourlyByDate(forecast.hourly.time, forecast.hourly.visibility, nextSunsetIso) ?? 10000,
    )
    const nextVisibilityKm = Math.round((nextVisibilityM / 1000) * 10) / 10
    const glowScore = computeGlowScore({
      cloudCover: nextCloud,
      humidity: nextHumidity,
      visibilityKm: nextVisibilityKm,
      aqi: null,
    })

    const azimuthDeg = Math.round(sunsetAzimuth(location.latitude, nextSunsetIso))
    const bestFacingDirection = azimuthToCompass(azimuthDeg)

    const payload: GlowInsightsPayload = {
      locationHint: profile.location_hint || location.label,
      glowScore,
      nextGoldenHour: {
        start: humanTime(nextGolden.startIso),
        end: humanTime(nextGolden.endIso),
        minutesUntil: minutesUntil(nextGolden.startIso),
      },
      timeline: [
        {
          key: 'sunrise',
          label: 'Sunrise',
          time: humanTime(forecast.daily.sunrise[0]),
          type: 'sunrise',
        },
        {
          key: 'golden_start',
          label: 'Golden start',
          time: humanTime(nextGolden.startIso),
          type: 'golden_start',
        },
        {
          key: 'sunset',
          label: 'Sunset',
          time: humanTime(nextGolden.sunsetIso),
          type: 'sunset',
        },
        {
          key: 'golden_end',
          label: 'Blue edge',
          time: humanTime(nextGolden.endIso),
          type: 'golden_end',
        },
      ],
      perfectShotDays,
      positioning: {
        azimuthDeg,
        bestFacingDirection,
        environments: ['Open skyline', 'Water reflections', 'Rooftop edges'],
      },
      actionCapsules: [
        {
          id: 'step_outside',
          label: 'Step outside at golden hour',
          detail: `${humanTime(nextGolden.startIso)} - ${humanTime(nextGolden.endIso)}`,
        },
        {
          id: 'five_min_reset',
          label: '5-min reset before sunset',
          detail: 'Breathing + hydration to lower nervous load before creation.',
        },
        {
          id: 'best_day',
          label: `Best day: ${topDay.dayLabel}`,
          detail: `${topDay.bestWindowStart} - ${topDay.bestWindowEnd}`,
        },
      ],
      insightSentence: `High-output window: glow score ${glowScore}. Best capture angle is ${bestFacingDirection}; strongest sky diffusion on ${topDay.dayLabel}.`,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[wellbeing/glow-insights]', error)
    return NextResponse.json({ error: 'Failed to load glow insights' }, { status: 500 })
  }
}
