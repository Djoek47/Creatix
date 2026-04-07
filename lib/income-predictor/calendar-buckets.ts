import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns'

export type CalendarBucket = { key: string; label: string; count: number }

function parseISO(d: string): Date {
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? new Date() : x
}

/**
 * Buckets published posts for weekly or monthly calendar views (counts only).
 */
export function bucketPublishedPosts(
  publishedDates: string[],
  mode: 'week' | 'month',
  anchor: Date = new Date(),
): CalendarBucket[] {
  const dates = publishedDates.map(parseISO).filter((d) => d.getTime() <= anchor.getTime())

  if (mode === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    const weeks = eachWeekOfInterval(
      { start: new Date(start.getTime() - 7 * 6 * 24 * 60 * 60 * 1000), end: anchor },
      { weekStartsOn: 1 },
    )
    const buckets: CalendarBucket[] = weeks.map((wStart) => {
      const wEnd = endOfWeek(wStart, { weekStartsOn: 1 })
      const key = format(wStart, 'yyyy-MM-dd')
      const count = dates.filter((d) => d >= wStart && d <= wEnd).length
      return {
        key,
        label: `${format(wStart, 'MMM d')} – ${format(wEnd, 'MMM d')}`,
        count,
      }
    })
    return buckets.slice(-8)
  }

  const mStart = startOfMonth(anchor)
  const months = eachMonthOfInterval({
    start: new Date(mStart.getFullYear(), mStart.getMonth() - 5, 1),
    end: anchor,
  })
  return months.map((m) => {
    const mEnd = endOfMonth(m)
    const count = dates.filter((d) => d >= m && d <= mEnd).length
    return {
      key: format(m, 'yyyy-MM'),
      label: format(m, 'MMM yyyy'),
      count,
    }
  })
}

/** Posts in the last `days` days (inclusive window). */
export function countPostsInWindow(publishedDates: string[], days: number, anchor: Date = new Date()): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return publishedDates.filter((s) => {
    const t = parseISO(s).getTime()
    return t >= cutoff && t <= anchor.getTime()
  }).length
}
