import assert from 'node:assert/strict'
import {
  divineManagerScrollElementId,
  isDivineManagerScrollSection,
} from '@/lib/divine-manager-deep-link'

assert.strictEqual(isDivineManagerScrollSection('protocol'), true)
assert.strictEqual(isDivineManagerScrollSection('text'), false)
assert.strictEqual(divineManagerScrollElementId('protocol'), 'divine-section-protocol')
assert.strictEqual(divineManagerScrollElementId('tasks'), 'divine-section-tasks')
assert.strictEqual(divineManagerScrollElementId('voice'), 'divine-section-voice')

console.log('divine-manager-deep-link: ok')
