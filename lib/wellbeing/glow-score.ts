export function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num))
}

export function computeGlowScore(input: {
  cloudCover: number
  humidity: number
  visibilityKm: number
  aqi?: number | null
}): number {
  const cloud = Number.isFinite(input.cloudCover) ? input.cloudCover : 50
  const humidity = Number.isFinite(input.humidity) ? input.humidity : 55
  const visibilityKm = Number.isFinite(input.visibilityKm) ? input.visibilityKm : 8
  const aqi = input.aqi != null && Number.isFinite(input.aqi) ? input.aqi : 30

  const cloudScore = clamp(100 - Math.abs(cloud - 35) * 2, 0, 100) // Ideal ~20-50%
  const humidityScore = clamp(100 - Math.abs(humidity - 55) * 1.4, 0, 100)
  const visibilityScore = clamp((visibilityKm / 16) * 100, 0, 100)
  const airScore = clamp(120 - aqi * 1.5, 0, 100)

  const weighted =
    cloudScore * 0.45 +
    humidityScore * 0.2 +
    visibilityScore * 0.25 +
    airScore * 0.1

  return Math.round(clamp(weighted, 0, 100))
}

export function scoreReason(score: number, cloudCover: number): string {
  if (score >= 85) {
    return `Exceptional color window. Cloud diffusion around ${Math.round(cloudCover)}% should produce dramatic sunset gradients.`
  }
  if (score >= 70) {
    return `Strong golden-hour texture expected with balanced cloud cover near ${Math.round(cloudCover)}%.`
  }
  if (score >= 55) {
    return `Good light with moderate atmospheric softness; look for skyline silhouettes.`
  }
  return `Usable but flatter light. Prioritize composition and reflections over sky saturation.`
}

export function skyGradientFromScore(score: number): string {
  if (score >= 85) return 'from-amber-300 via-orange-400 to-fuchsia-500'
  if (score >= 70) return 'from-amber-200 via-rose-300 to-violet-400'
  if (score >= 55) return 'from-yellow-100 via-orange-200 to-sky-300'
  return 'from-slate-200 via-slate-300 to-slate-500'
}
