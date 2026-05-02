import assert from 'node:assert/strict'
import {
  applySessionEnergyTick,
  fatigueToEnergyPercent,
  SESSION_ENERGY_DEPLETE_MS,
  SESSION_ENERGY_FULL_RECOVERY_MS,
  sessionEnergyLocalDayKey,
} from '@/lib/wellbeing/session-energy-meter'

const t0 = new Date('2010-06-15T12:00:00.000Z').getTime()
const day = sessionEnergyLocalDayKey(new Date(t0))

let p = { fatigue: 0, lastTs: t0, lastLocalDay: day, visibleStreakMs: 0 }
p = applySessionEnergyTick(p, t0 + SESSION_ENERGY_DEPLETE_MS, true)
assert.ok(Math.abs(p.fatigue - 1) < 1e-9)
assert.ok(Math.abs(p.visibleStreakMs - SESSION_ENERGY_DEPLETE_MS) < 2)
assert.strictEqual(fatigueToEnergyPercent(p.fatigue), 0)

const afterNewDay = applySessionEnergyTick(
  { fatigue: 0.9, lastTs: t0, lastLocalDay: '2009-12-31', visibleStreakMs: 99 },
  t0,
  true,
)
assert.strictEqual(afterNewDay.fatigue, 0)
assert.strictEqual(afterNewDay.visibleStreakMs, 99)

p = { fatigue: 1, lastTs: t0, lastLocalDay: day, visibleStreakMs: 5000 }
p = applySessionEnergyTick(p, t0 + SESSION_ENERGY_FULL_RECOVERY_MS, false)
assert.ok(Math.abs(p.fatigue - 0) < 1e-9)
assert.strictEqual(p.visibleStreakMs, 0)
assert.strictEqual(fatigueToEnergyPercent(p.fatigue), 100)

console.log('session-energy-meter: ok')
