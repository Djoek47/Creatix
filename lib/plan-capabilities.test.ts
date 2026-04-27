import assert from 'node:assert/strict'
import { resolveProductMode, resolveWorkspaceCapabilities } from '@/lib/plan-capabilities'

const envDefault = { CREATIX_PRODUCT_MODE: undefined } as NodeJS.ProcessEnv
const envNonApi = { CREATIX_PRODUCT_MODE: 'non_api_protection' } as NodeJS.ProcessEnv

assert.equal(resolveProductMode(envDefault), 'default')
assert.equal(resolveProductMode(envNonApi), 'non_api_protection')

const protectionOnlyRow = {
  plan_id: 'divine-trial',
  status: 'canceled',
  protection_plan_active: true,
}
const capsProtection = resolveWorkspaceCapabilities(protectionOnlyRow)
assert.equal(capsProtection.isNonApiProtectionTier, true)
assert.equal(capsProtection.canUseMessaging, false)

const trialActiveRow = {
  plan_id: 'divine-trial',
  status: 'trialing',
  protection_plan_active: true,
}
const capsTrial = resolveWorkspaceCapabilities(trialActiveRow)
assert.equal(capsTrial.isNonApiProtectionTier, false)
assert.equal(capsTrial.canUseMessaging, true)

const proRow = {
  plan_id: 'cev-paid',
  status: 'active',
  protection_plan_active: true,
}
const capsPro = resolveWorkspaceCapabilities(proRow)
assert.equal(capsPro.isNonApiProtectionTier, false)

console.log('plan-capabilities.test.ts: ok')
