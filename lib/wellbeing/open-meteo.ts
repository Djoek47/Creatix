export type OpenMeteoForecast = {
  timezone: string
  hourly: {
    time: string[]
    cloud_cover: number[]
    relative_humidity_2m: number[]
    visibility: number[]
  }
  daily: {
    time: string[]
    sunrise: string[]
    sunset: string[]
  }
}

type OpenMeteoAirQuality = {
  hourly?: {
    time?: string[]
    us_aqi?: number[]
  }
}

export async function fetchOpenMeteoForecast(
  latitude: number,
  longitude: number,
): Promise<OpenMeteoForecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('hourly', 'cloud_cover,relative_humidity_2m,visibility')
  url.searchParams.set('daily', 'sunrise,sunset')
  url.searchParams.set('forecast_days', '6')
  url.searchParams.set('timezone', 'auto')
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Open-Meteo forecast request failed')
  return (await res.json()) as OpenMeteoForecast
}

export async function fetchOpenMeteoAqi(
  latitude: number,
  longitude: number,
): Promise<{ byIsoTime: Map<string, number> }> {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('hourly', 'us_aqi')
  url.searchParams.set('forecast_days', '6')
  url.searchParams.set('timezone', 'auto')
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) return { byIsoTime: new Map() }
  const json = (await res.json()) as OpenMeteoAirQuality
  const times = json.hourly?.time ?? []
  const aqi = json.hourly?.us_aqi ?? []
  const byIsoTime = new Map<string, number>()
  for (let i = 0; i < times.length; i += 1) {
    const value = Number(aqi[i])
    if (Number.isFinite(value)) byIsoTime.set(String(times[i]), value)
  }
  return { byIsoTime }
}
