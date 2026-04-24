import type { GoldenHourWindow } from '@/lib/wellbeing/types'

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
]

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((now - start) / 86400000)
}

function toIsoWithOffset(baseIso: string, minutes: number): string {
  const d = new Date(baseIso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

export function buildGoldenHourWindow(sunsetIso: string): GoldenHourWindow {
  return {
    startIso: toIsoWithOffset(sunsetIso, -60),
    endIso: toIsoWithOffset(sunsetIso, 15),
    sunsetIso,
  }
}

export function sunsetAzimuth(latitude: number, referenceDateIso: string): number {
  const latRad = (latitude * Math.PI) / 180
  const n = dayOfYear(new Date(referenceDateIso))
  const declination = ((23.44 * Math.PI) / 180) * Math.sin(((2 * Math.PI) / 365) * (n - 81))
  const ratio = Math.sin(declination) / Math.max(0.01, Math.cos(latRad))
  const clamped = Math.max(-1, Math.min(1, ratio))
  const offset = (Math.asin(clamped) * 180) / Math.PI
  const az = 270 - offset
  return ((az % 360) + 360) % 360
}

export function azimuthToCompass(azimuthDeg: number): string {
  const idx = Math.round((((azimuthDeg % 360) + 360) % 360) / 22.5) % 16
  return COMPASS[idx]
}

export function minutesUntil(isoDate: string): number {
  return Math.max(0, Math.round((new Date(isoDate).getTime() - Date.now()) / 60000))
}
