import type { User, SupabaseClient } from '@supabase/supabase-js'
import { tryDecryptLocationPayload } from '@/lib/location-vault'
import { fetchOpenMeteoAqi, fetchOpenMeteoForecast } from '@/lib/wellbeing/open-meteo'
import { computeGlowScore, scoreReason, skyGradientFromScore } from '@/lib/wellbeing/glow-score'
import { azimuthToCompass, buildGoldenHourWindow, minutesUntil, sunsetAzimuth } from '@/lib/wellbeing/golden-hour'
import type { GlowInsightsPayload, PerfectShotDay } from '@/lib/wellbeing/types'
import { insightTimeEn, insightWeekdayShort, parseLocalDateYmd } from '@/lib/wellbeing/insight-locale'

export type GlowInsightsResult =
  | { ok: true; data: GlowInsightsPayload }
  | { ok: false; error: string; status: number }

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
  return insightTimeEn(iso)
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

function parseLocationFallback(raw: unknown): { encrypted: string; hint: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.encrypted !== 'string' || typeof row.hint !== 'string') return null
  return { encrypted: row.encrypted, hint: row.hint }
}

function getMoonPhaseIndex(date: Date) {
  const knownNewMoon = new Date('2024-01-11')
  const lunarCycle = 29.53
  const daysSinceNew = Math.floor((date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24))
  const daysIntoPhase = ((daysSinceNew % lunarCycle) + lunarCycle) % lunarCycle
  return Math.floor((daysIntoPhase / lunarCycle) * 8) % 8
}

function buildFallbackPayload(hasBirthday: boolean): GlowInsightsPayload {
  const now = new Date()
  const baseWindowStart = new Date(now)
  baseWindowStart.setHours(19, 0, 0, 0)
  if (baseWindowStart.getTime() < now.getTime()) {
    baseWindowStart.setDate(baseWindowStart.getDate() + 1)
  }
  const baseWindowEnd = new Date(baseWindowStart.getTime() + 45 * 60 * 1000)
  const baseMoonIndex = getMoonPhaseIndex(baseWindowStart)
  const moonBoost = [8, 12, 16, 20, 24, 18, 14, 10][baseMoonIndex] ?? 12
  const baseScore = Math.min(92, 56 + moonBoost)
  const perfectShotDays: PerfectShotDay[] = Array.from({ length: 5 }).map((_, index) => {
    const dayDate = new Date(baseWindowStart)
    dayDate.setDate(dayDate.getDate() + index)
    const phaseIdx = getMoonPhaseIndex(dayDate)
    const score = Math.max(52, Math.min(95, 54 + ([8, 12, 16, 20, 24, 18, 14, 10][phaseIdx] ?? 12) + (4 - index) * 2))
    const start = new Date(dayDate)
    start.setHours(18, 50, 0, 0)
    const end = new Date(start.getTime() + 45 * 60 * 1000)
    return {
      date: dayDate.toISOString().split('T')[0],
      dayLabel: insightWeekdayShort(dayDate),
      score,
      bestWindowStart: insightTimeEn(start),
      bestWindowEnd: insightTimeEn(end),
      reason: hasBirthday
        ? 'Moon-phase rhythm aligned with your birthday profile.'
        : 'Balanced evening light and moon rhythm.',
      skyGradient: score > 80 ? 'from-amber-200 via-rose-200 to-violet-300' : 'from-amber-100 via-sky-100 to-violet-200',
      cloudCover: 35,
      humidity: 52,
      visibilityKm: 10,
    }
  })
  const topDay = [...perfectShotDays].sort((a, b) => b.score - a.score)[0]
  return {
    insightSource: hasBirthday ? 'birthday' : 'baseline',
    locationHint: hasBirthday ? 'Birthday-calibrated mode' : 'Calm baseline mode',
    glowScore: baseScore,
    nextGoldenHour: {
      start: insightTimeEn(baseWindowStart),
      end: insightTimeEn(baseWindowEnd),
      minutesUntil: Math.max(0, Math.round((baseWindowStart.getTime() - now.getTime()) / 60000)),
    },
    timeline: [
      {
        key: 'sunrise',
        label: 'Body wake',
        time: 'Morning reset',
        type: 'sunrise',
      },
      {
        key: 'golden_start',
        label: 'Creative rise',
        time: insightTimeEn(baseWindowStart),
        type: 'golden_start',
      },
      {
        key: 'sunset',
        label: 'Peak expression',
        time: topDay.bestWindowStart,
        type: 'sunset',
      },
      {
        key: 'golden_end',
        label: 'Soft close',
        time: insightTimeEn(baseWindowEnd),
        type: 'golden_end',
      },
    ],
    perfectShotDays,
    positioning: {
      azimuthDeg: 255,
      bestFacingDirection: 'West-Southwest',
      environments: ['Window light', 'Open skyline', 'Reflective surfaces'],
    },
    actionCapsules: [
      {
        id: 'calm_prep',
        label: '5-min nervous system reset',
        detail: 'Breath + hydrate before your creative window.',
      },
      {
        id: 'capture_window',
        label: `Capture during ${topDay.dayLabel}`,
        detail: `${topDay.bestWindowStart} - ${topDay.bestWindowEnd}`,
      },
      {
        id: 'calendar_mode',
        label: hasBirthday ? 'Use moon calendar mode' : 'Add birthday for deeper lunar guidance',
        detail: hasBirthday
          ? 'Your lunar rhythm is active in this fallback mode.'
          : 'You still get baseline guidance without location.',
      },
    ],
    insightSentence: hasBirthday
      ? `Birthday-calibrated mode is active. Lunar rhythm suggests strongest output on ${topDay.dayLabel} during ${topDay.bestWindowStart}-${topDay.bestWindowEnd}.`
      : `Location is optional. Baseline mode still maps your next high-output window at ${topDay.bestWindowStart}-${topDay.bestWindowEnd}.`,
    setupHint: 'Add location in Settings for precise weather and azimuth intelligence.',
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Full glow-insights payload (location + Open‑Meteo, birthday/baseline fallback, or 502 on bad forecast).
 */
export async function computeGlowInsightsForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<GlowInsightsResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('encrypted_location, has_location_set, location_hint, has_birthday_set')
    .eq('id', user.id)
    .maybeSingle()

  const fallbackVault = parseLocationFallback(
    ((user.user_metadata ?? {}) as Record<string, unknown>).location_vault,
  )
  const encryptedLocation = profile?.encrypted_location ?? fallbackVault?.encrypted ?? null
  const locationHint = profile?.location_hint ?? fallbackVault?.hint ?? null

  if (!encryptedLocation) {
    return { ok: true, data: buildFallbackPayload(Boolean(profile?.has_birthday_set)) }
  }

  const location = tryDecryptLocationPayload(user.id, String(encryptedLocation))
  if (!location) {
    console.warn(
      '[computeGlowInsightsForUser] encrypted_location could not be decrypted (vault secret mismatch, corrupt blob, or legacy ciphertext); using baseline glow',
    )
    return { ok: true, data: buildFallbackPayload(Boolean(profile?.has_birthday_set)) }
  }

  try {
    const [forecast, aqi] = await Promise.all([
      fetchOpenMeteoForecast(location.latitude, location.longitude),
      fetchOpenMeteoAqi(location.latitude, location.longitude),
    ])
    if (!forecast.daily?.sunset?.length || !forecast.daily?.sunrise?.length) {
      return { ok: false, error: 'Forecast data unavailable for this location', status: 502 }
    }

    const now = Date.now()
    const windows = forecast.daily.sunset.map((sunsetIso) => buildGoldenHourWindow(sunsetIso))
    const nextGolden = windows.find((w) => new Date(w.endIso).getTime() > now) ?? windows[0]
    if (!nextGolden) {
      return { ok: true, data: buildFallbackPayload(Boolean(profile?.has_birthday_set)) }
    }

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
        dayLabel: insightWeekdayShort(parseLocalDateYmd(date)),
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

    if (!perfectShotDays.length) {
      return { ok: true, data: buildFallbackPayload(Boolean(profile?.has_birthday_set)) }
    }

    const topDay = [...perfectShotDays].sort((a, b) => b.score - a.score)[0]
    const nextSunsetIso = nextGolden.sunsetIso ?? forecast.daily.sunset[0]
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
      insightSource: 'location',
      locationHint: locationHint || location.label,
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
      setupHint: undefined,
      updatedAt: new Date().toISOString(),
    }

    return { ok: true, data: payload }
  } catch (err) {
    console.warn('[computeGlowInsightsForUser] location decrypt / weather / assemble failed; using baseline glow', err)
    return { ok: true, data: buildFallbackPayload(Boolean(profile?.has_birthday_set)) }
  }
}
