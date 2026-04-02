import { getHolidaysForDate, type CosmicHolidayEntry } from '@/lib/calendar/global-holidays'

export type UpcomingCosmicEvent = {
  id: string
  date: Date
  holiday: CosmicHolidayEntry
}

/** Next `daysAhead` calendar days, flattened (multiple holidays on one day = multiple entries). */
export function getUpcomingCosmicEvents(daysAhead: number): UpcomingCosmicEvent[] {
  const out: UpcomingCosmicEvent[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const holidays = getHolidaysForDate(d)
    for (const h of holidays) {
      const iso = d.toISOString().slice(0, 10)
      out.push({
        id: `${iso}::${h.name}`,
        date: d,
        holiday: h,
      })
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime())
}
