/** Deterministic temperate latitudes / full longitudes — used when vault has no site. NOT geolocation-specific. */

function fnv1aSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function seededObservationLatLon(seedKey: string): { latitude: number; longitude: number } {
  const h = fnv1aSeed(seedKey)
  const hi = Math.imul(h, 747796405) >>> 0
  /** Avoid polar rims; inhabited band bias */
  const lat = -48 + (((h >>> 4) % 1250) / 10 + ((hi >>> 12) % 50) / 100)
  let lon = ((h >>> 17) % 3600) / 10 - 180
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360
  return {
    latitude: Math.min(71, Math.max(-54, lat)),
    longitude: lon,
  }
}
