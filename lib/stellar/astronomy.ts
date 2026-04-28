/** Astronomy helpers: UTC → LMST → horizontal coords → planar projection for sky canvas. Angles in degrees unless noted. */

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

export function jdFromDateUtc(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5
}

/** Greenwich mean sidereal time in degrees [0, 360). Linear UT approximation. */
export function gmstDegrees(jdUtc: number): number {
  let gmst = 280.46061837 + 360.98564736629 * (jdUtc - 2451545.0)
  gmst = ((gmst % 360) + 360) % 360
  return gmst
}

export function localSiderealDegrees(jdUtc: number, longitudeEastDeg: number): number {
  const lst = gmstDegrees(jdUtc) + longitudeEastDeg
  return ((lst % 360) + 360) % 360
}

export type HorizonCoords = {
  altitudeDeg: number
  azimuthDeg: number
}

/** East longitude positive (standard geodesy here); azimuth clockwise from geographic north → east positive. */
export function raDecToAltAzDeg(
  raDeg: number,
  decDeg: number,
  latitudeDeg: number,
  lstDeg: number,
): HorizonCoords {
  let haDeg = lstDeg - raDeg
  haDeg = ((haDeg % 360) + 360) % 360
  if (haDeg > 180) haDeg -= 360

  const dec = decDeg * D2R
  const lat = latitudeDeg * D2R
  const ha = haDeg * D2R

  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const altitudeDeg = altRad * R2D

  let azimuthDeg = Math.atan2(
    -(Math.cos(dec) * Math.sin(ha)),
    Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(ha),
  ) * R2D
  if (azimuthDeg < 0) azimuthDeg += 360

  return { altitudeDeg, azimuthDeg }
}

/** Zenith-facing orthographic disc: zenith centre, horizon edge. coords normalized ~[-1,1] inside unit circle */
export function projectAltAzNormalized(altitudeDeg: number, azimuthDeg: number): { x: number; y: number } {
  const z = Math.max(0, 90 - altitudeDeg)
  const zRad = z * D2R
  const r = Math.sin(zRad)
  const a = azimuthDeg * D2R
  return { x: r * Math.sin(a), y: -r * Math.cos(a) }
}
