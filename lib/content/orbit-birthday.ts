/** Month + day for Content Orbit annual marker (calendar uses JS month index 0–11). */
export type OrbitAnnualDate = { monthIndex: number; day: number }

/** Parse `M-D` or `MM-DD` (1-based month). Returns null if invalid or `none`. */
export function resolveContentOrbitBirthdayMd(raw: string | undefined): OrbitAnnualDate | null {
  const s = raw?.trim()
  if (!s || s.toLowerCase() === 'none') return null
  const m = /^(\d{1,2})[./-](\d{1,2})$/.exec(s)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { monthIndex: month - 1, day }
}
