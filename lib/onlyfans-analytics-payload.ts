/**
 * Normalize bodies for OnlyFansAPI.com **global** analytics routes
 * (`POST /api/analytics/...`) so partner validation errors are avoided.
 */

const DEFAULT_FORECAST_MODEL = 'linear_regression'
const DEFAULT_HISTORICAL_DAYS = 90
const DEFAULT_FORECAST_DAYS = 90
const MAX_FORECAST_DAYS = 180
const MAX_HISTORICAL_DAYS = 180

function horizonMonthsToDays(horizonMonths: unknown): number {
  const m = typeof horizonMonths === 'number' && Number.isFinite(horizonMonths) ? horizonMonths : Number(horizonMonths)
  const months = Number.isFinite(m) && m > 0 ? Math.min(12, m) : 3
  return Math.min(MAX_FORECAST_DAYS, Math.max(7, Math.round(months * 30)))
}

/**
 * Partner `POST /analytics/financial/forecast` expects metric, model, historical_days, forecast_days.
 * Legacy callers send `forecast_metric` and/or `horizon_months` only.
 */
export function normalizeAnalyticsForecastBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body }
  const metric =
    (typeof out.metric === 'string' && out.metric.trim()) ||
    (typeof out.forecast_metric === 'string' && out.forecast_metric.trim()) ||
    'revenue'
  out.metric = metric
  out.forecast_metric = out.forecast_metric ?? metric

  if (out.model == null || String(out.model).trim() === '') {
    out.model = DEFAULT_FORECAST_MODEL
  }

  if (out.historical_days == null || String(out.historical_days).trim() === '') {
    out.historical_days = DEFAULT_HISTORICAL_DAYS
  } else {
    const hd = Number(out.historical_days)
    out.historical_days =
      Number.isFinite(hd) && hd > 0 ? Math.min(MAX_HISTORICAL_DAYS, Math.floor(hd)) : DEFAULT_HISTORICAL_DAYS
  }

  if (out.forecast_days == null || String(out.forecast_days).trim() === '') {
    out.forecast_days = horizonMonthsToDays(out.horizon_months)
  } else {
    const fd = Number(out.forecast_days)
    out.forecast_days =
      Number.isFinite(fd) && fd > 0 ? Math.min(MAX_FORECAST_DAYS, Math.floor(fd)) : horizonMonthsToDays(out.horizon_months)
  }

  return out
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Partner period comparison expects previous_* and current_* windows.
 * UI sends a single `start_date` / `end_date` range (treated as the **current** window).
 */
export function normalizeAnalyticsComparisonBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body }
  if (
    out.previous_start &&
    out.previous_end &&
    out.current_start &&
    out.current_end &&
    typeof out.previous_start === 'string' &&
    typeof out.previous_end === 'string' &&
    typeof out.current_start === 'string' &&
    typeof out.current_end === 'string'
  ) {
    return out
  }

  const startRaw =
    (typeof out.start_date === 'string' && out.start_date) ||
    (typeof out.current_start === 'string' && out.current_start) ||
    null
  const endRaw =
    (typeof out.end_date === 'string' && out.end_date) ||
    (typeof out.current_end === 'string' && out.current_end) ||
    null
  if (!startRaw || !endRaw) return out

  const start = new Date(`${startRaw}T12:00:00.000Z`)
  const end = new Date(`${endRaw}T12:00:00.000Z`)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    return out
  }

  const spanMs = end.getTime() - start.getTime()
  const spanDays = Math.max(1, Math.round(spanMs / 86400000) + 1)

  const prevEnd = new Date(start)
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setUTCDate(prevStart.getUTCDate() - (spanDays - 1))

  out.current_start = out.current_start ?? startRaw
  out.current_end = out.current_end ?? endRaw
  out.previous_start = out.previous_start ?? toYmd(prevStart)
  out.previous_end = out.previous_end ?? toYmd(prevEnd)
  return out
}
