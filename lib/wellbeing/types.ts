export type GoldenHourWindow = {
  startIso: string
  endIso: string
  sunsetIso: string
}

export type PerfectShotDay = {
  date: string
  dayLabel: string
  score: number
  bestWindowStart: string
  bestWindowEnd: string
  reason: string
  skyGradient: string
  cloudCover: number
  humidity: number
  visibilityKm: number
}

export type PositioningHints = {
  azimuthDeg: number
  bestFacingDirection: string
  environments: string[]
}

export type GlowInsightsPayload = {
  locationHint: string
  glowScore: number
  nextGoldenHour: {
    start: string
    end: string
    minutesUntil: number
  }
  timeline: Array<{
    key: string
    label: string
    time: string
    type: 'sunrise' | 'golden_start' | 'sunset' | 'golden_end'
  }>
  perfectShotDays: PerfectShotDay[]
  positioning: PositioningHints
  actionCapsules: Array<{
    id: string
    label: string
    detail: string
  }>
  insightSentence: string
  updatedAt: string
}
