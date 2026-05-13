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

assert.equal('modalities' in sessionConfig, false)
assert.equal('output_modalities' in sessionConfig, false)
assert.equal('turn_detection' in sessionConfig, false)
assert.equal('parallel_tool_calls' in sessionConfig, false)
assert.equal('tracing' in sessionConfig, false)
assert.deepEqual((sessionConfig.audio as { input?: unknown }).input, {
  turn_detection: {
    type: 'semantic_vad',
    eagerness: 'medium',
    create_response: true,
    interrupt_response: true,
  },
})
assert.deepEqual(sessionConfig.reasoning, { effort: 'medium' })

console.log('divine realtime agent harness: ok')
