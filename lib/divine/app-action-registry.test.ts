import assert from 'node:assert/strict'
import {
  isAllowedUiNavigatePath,
  isRiskyAppActionTool,
  isSafeParallelAppActionTool,
} from '@/lib/divine/app-action-registry'
import { isRegisteredDivineGuideControl } from '@/lib/divine/page-control-registry'

assert.strictEqual(isAllowedUiNavigatePath('/dashboard/well-being'), true)
assert.strictEqual(isAllowedUiNavigatePath('/dashboard/retention/churn'), true)
assert.strictEqual(isAllowedUiNavigatePath('/dashboard/ai-studio/tools/leak-scanner'), true)
assert.strictEqual(isAllowedUiNavigatePath('/dashboard/messages?fanId=fan_123'), true)
assert.strictEqual(isAllowedUiNavigatePath('/dashboard/settings?tab=billing'), true)

assert.strictEqual(isAllowedUiNavigatePath('/dashboard/settings?tab=../../billing'), false)
assert.strictEqual(isAllowedUiNavigatePath('/admin'), false)
assert.strictEqual(isAllowedUiNavigatePath('/dashboard/ai-studio/tools/leak-scanner?run=1'), false)

assert.strictEqual(isRiskyAppActionTool('mass_dm'), true)
assert.strictEqual(isRiskyAppActionTool('get_stats'), false)
assert.strictEqual(isSafeParallelAppActionTool('get_stats'), true)

assert.strictEqual(isRegisteredDivineGuideControl('wellbeing-light-place', '/dashboard/well-being'), true)
assert.strictEqual(isRegisteredDivineGuideControl('wellbeing-light-place', '/dashboard/protection'), false)
assert.strictEqual(isRegisteredDivineGuideControl('unknown-selector', '/dashboard/well-being'), false)

console.log('divine app action registry: ok')
