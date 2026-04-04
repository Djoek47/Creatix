/** Admin overview: filter AI usage / messages / errors by time window. */

export type AdminOverviewRangeMode = 'live' | 'today' | '24h' | '7d' | '30d' | 'day'

export type AdminOverviewRangeResolved = {
  mode: AdminOverviewRangeMode
  /** Human-readable label for the UI */
  title: string
  sinceIso: string
  /** Upper bound inclusive; null = open-ended (only `since` — not used; we always set an end for queries) */
  untilIso: string
  /** UTC date string for voice-state table (inclusive range) */
  voiceDayStart: string
  voiceDayEnd: string
}

function utcDayBounds(d: Date): { start: string; end: string } {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  const start = new Date(Date.UTC(y, m, day, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, day, 23, 59, 59, 999))
  return { start: start.toISOString(), end: end.toISOString() }
}

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Parse `range` + optional `day` (YYYY-MM-DD) from admin overview URL search params.
 * Default: last 30 days (matches prior dashboard behavior).
 */
export function resolveAdminOverviewRange(params: {
  range?: string | null
  day?: string | null
}): AdminOverviewRangeResolved {
  const now = Date.now()
  const nowDate = new Date(now)
  const dayParam = params.day?.trim()

  if (dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
    const d = new Date(`${dayParam}T12:00:00.000Z`)
    const { start, end } = utcDayBounds(d)
    return {
      mode: 'day',
      title: `Day ${dayParam} (UTC)`,
      sinceIso: start,
      untilIso: end,
      voiceDayStart: dayParam,
      voiceDayEnd: dayParam,
    }
  }

  const r = (params.range ?? '30d').toLowerCase().trim()

  if (r === 'live') {
    const since = new Date(now - 60 * 60 * 1000).toISOString()
    const until = new Date(now).toISOString()
    const vd = utcDateString(nowDate)
    return {
      mode: 'live',
      title: 'Live — last 60 minutes',
      sinceIso: since,
      untilIso: until,
      voiceDayStart: vd,
      voiceDayEnd: vd,
    }
  }

  if (r === 'today') {
    const { start } = utcDayBounds(nowDate)
    const until = new Date(now).toISOString()
    const vd = utcDateString(nowDate)
    return {
      mode: 'today',
      title: 'Today (UTC, so far)',
      sinceIso: start,
      untilIso: until,
      voiceDayStart: vd,
      voiceDayEnd: vd,
    }
  }

  if (r === '24h' || r === '1d') {
    return {
      mode: '24h',
      title: 'Last 24 hours',
      sinceIso: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      untilIso: new Date(now).toISOString(),
      voiceDayStart: utcDateString(new Date(now - 24 * 60 * 60 * 1000)),
      voiceDayEnd: utcDateString(nowDate),
    }
  }

  if (r === '7d') {
    const since = new Date(now - 7 * 86400000).toISOString()
    const until = new Date(now).toISOString()
    return {
      mode: '7d',
      title: 'Last 7 days',
      sinceIso: since,
      untilIso: until,
      voiceDayStart: utcDateString(new Date(now - 7 * 86400000)),
      voiceDayEnd: utcDateString(nowDate),
    }
  }

  const days = r === '30d' ? 30 : 30
  const since = new Date(now - days * 86400000).toISOString()
  const until = new Date(now).toISOString()
  return {
    mode: '30d',
    title: 'Last 30 days',
    sinceIso: since,
    untilIso: until,
    voiceDayStart: utcDateString(new Date(now - days * 86400000)),
    voiceDayEnd: utcDateString(nowDate),
  }
}
