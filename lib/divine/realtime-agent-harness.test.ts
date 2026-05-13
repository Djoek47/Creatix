import assert from 'node:assert/strict'
import {
  buildDivineRealtimeSessionConfig,
  classifyRealtimeToolSafety,
  orderRealtimeToolCalls,
  realtimeReasoningEffortForPersonality,
} from '@/lib/divine/realtime-agent-harness'
import { defaultVoicePersonality } from '@/lib/divine/voice-personality'

assert.strictEqual(classifyRealtimeToolSafety('get_stats'), 'safe_parallel')
assert.strictEqual(classifyRealtimeToolSafety('mass_dm'), 'risky_serial')
assert.strictEqual(classifyRealtimeToolSafety('send_message'), 'risky_serial')
assert.strictEqual(classifyRealtimeToolSafety('end_call'), 'session_control')
assert.strictEqual(classifyRealtimeToolSafety('run_ai_studio_tool'), 'safe_serial')

const ordered = orderRealtimeToolCalls([
  { name: 'get_stats' },
  { name: 'mass_dm' },
  { name: 'list_fans' },
  { name: 'end_call' },
])

assert.deepEqual(
  ordered.parallel.map((call) => call.name),
  ['get_stats', 'list_fans'],
)
assert.deepEqual(
  ordered.serial.map((call) => call.name),
  ['mass_dm'],
)
assert.deepEqual(
  ordered.endCall.map((call) => call.name),
  ['end_call'],
)

assert.strictEqual(
  realtimeReasoningEffortForPersonality({
    ...defaultVoicePersonality(),
    reasoning_effort: 'medium',
    navigation_autonomy: 'act',
  }),
  'high',
)

const sessionConfig = buildDivineRealtimeSessionConfig({
  model: 'gpt-realtime-2',
  instructions: 'You are Divine.',
  voice: 'marin',
  tools: [],
  personality: defaultVoicePersonality(),
})

assert.deepEqual(sessionConfig.output_modalities, ['audio'])
assert.equal('modalities' in sessionConfig, false)
assert.deepEqual(sessionConfig.reasoning, { effort: 'medium' })

console.log('divine realtime agent harness: ok')
