import assert from 'node:assert/strict'
import {
  applyVoicePersonalityPreset,
  defaultVoicePersonality,
  DIVINE_VOICE_PERSONALITY_PRESETS,
  resolveVoicePersonality,
} from '@/lib/divine/voice-personality'

const fallback = resolveVoicePersonality({
  manager_talkativeness: 'high',
})

assert.strictEqual(fallback.talkativeness, 80)
assert.strictEqual(fallback.preset_id, 'balanced_partner')
assert.strictEqual(fallback.initiative, 'manager_led')
assert.strictEqual(fallback.reasoning_effort, 'low')
assert.strictEqual(fallback.navigation_autonomy, 'suggest')

const proactive = applyVoicePersonalityPreset(defaultVoicePersonality(), 'proactive_manager')
assert.strictEqual(proactive.preset_id, 'proactive_manager')
assert.strictEqual(proactive.reasoning_effort, 'high')
assert.strictEqual(proactive.navigation_autonomy, 'act')
assert.strictEqual(proactive.pro_mode, true)

assert.ok(DIVINE_VOICE_PERSONALITY_PRESETS.some((preset) => preset.id === 'studio_director'))

console.log('divine voice personality: ok')
