/**
 * Glow / wellbeing copy is English regardless of browser or Node default locale.
 * Avoid `toLocale*([], …)` and parse `YYYY-MM-DD` as local calendar days (not UTC-only).
 */

const WEEKDAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function insightWeekdayShort(d: Date): string {
  return WEEKDAY_SHORT_EN[d.getDay()] ?? '—'
}

/** Open-Meteo daily `time` is `YYYY-MM-DD` — interpret as a local calendar day. */
export function parseLocalDateYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return new Date(ymd)
  const y = Number(m[1])
  const mo = Number(m[2])
  const day = Number(m[3])
  return new Date(y, mo - 1, day)
}

export function insightTimeEn(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
