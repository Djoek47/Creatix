import assert from 'node:assert/strict'
import {
  awayRecoveryEnergyBonus,
  AWAY_RECOVERY_MIN_HOURS,
  focusTempoAdjustment,
  idleDrainEnergyPenalty,
  IDLE_DRAIN_THRESHOLD_MIN,
  platformStaleStressMultiplier,
  quietDayStressMultiplier,
  QUIET_DAY_ACTION_THRESHOLD,
} from '@/lib/wellbeing/flow-presence-heuristic'

assert.equal(awayRecoveryEnergyBonus(null), 0)
assert.equal(awayRecoveryEnergyBonus(AWAY_RECOVERY_MIN_HOURS - 0.1), 0)
assert.ok(awayRecoveryEnergyBonus(40) >= 8)

assert.equal(idleDrainEnergyPenalty(IDLE_DRAIN_THRESHOLD_MIN - 1, true), 0)
assert.equal(idleDrainEnergyPenalty(0, false), 0)
assert.ok(idleDrainEnergyPenalty(IDLE_DRAIN_THRESHOLD_MIN + 120, true) <= 8)

assert.ok(quietDayStressMultiplier(0) < 1)
assert.equal(quietDayStressMultiplier(QUIET_DAY_ACTION_THRESHOLD), 1)

assert.equal(platformStaleStressMultiplier(null), 1)
assert.ok(platformStaleStressMultiplier(100) < 1)

const ft = focusTempoAdjustment({
  idleStreakApproxMinutes: 5,
  heartbeatFresh: true,
  interactionMedianGapSec: null,
  compositePressure: 40,
})
assert.ok(ft >= -12 && ft <= 12)

console.log('flow-presence-heuristic.test.ts: ok')
