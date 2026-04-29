import assert from 'node:assert/strict'
import { canConnectAdultPartnerPlatform, canUseCreditGatedProFeature } from '@/lib/billing/access'

const paid = { plan_id: 'cev-paid', status: 'active' as const }
const trial = { plan_id: 'divine-trial', status: 'trialing' as const }
const free = { plan_id: 'cev-free', status: 'active' as const }

assert.equal(canConnectAdultPartnerPlatform(null), canUseCreditGatedProFeature(null))
assert.equal(canConnectAdultPartnerPlatform(paid), canUseCreditGatedProFeature(paid))
assert.equal(canConnectAdultPartnerPlatform(trial), canUseCreditGatedProFeature(trial))
assert.equal(canConnectAdultPartnerPlatform(free), canUseCreditGatedProFeature(free))
assert.equal(canConnectAdultPartnerPlatform(paid), true)
assert.equal(canConnectAdultPartnerPlatform(free), false)

console.log('partner-connect-gate: ok')
