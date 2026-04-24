/**
 * Run: pnpm exec tsx lib/onlyfans-analytics-payload.test.ts
 */
import assert from 'node:assert/strict'
import {
  normalizeAnalyticsComparisonBody,
  normalizeAnalyticsForecastBody,
} from '@/lib/onlyfans-analytics-payload'

function run() {
  const fc = normalizeAnalyticsForecastBody({ horizon_months: 3 })
  assert.equal(fc.metric, 'revenue')
  assert.equal(fc.model, 'linear_regression')
  assert.equal(fc.historical_days, 90)
  assert.ok(typeof fc.forecast_days === 'number' && fc.forecast_days >= 7 && fc.forecast_days <= 180)

  const cmp = normalizeAnalyticsComparisonBody({
    account_ids: ['acct'],
    start_date: '2026-03-01',
    end_date: '2026-03-30',
  })
  assert.equal(cmp.current_start, '2026-03-01')
  assert.equal(cmp.current_end, '2026-03-30')
  assert.ok(typeof cmp.previous_start === 'string' && cmp.previous_start.length === 10)
  assert.ok(typeof cmp.previous_end === 'string' && cmp.previous_end.length === 10)
}

run()
console.log('onlyfans-analytics-payload: ok')
