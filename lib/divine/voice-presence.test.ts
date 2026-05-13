import assert from 'node:assert/strict'
import {
  buildPostNavigationPrompt,
  buildVoiceStartupPrompt,
  localVoiceDate,
  nextVoicePresenceAfterGreeting,
  nextVoicePresenceAfterUserSpeech,
  nextVoicePresenceOnStart,
} from '@/lib/divine/voice-presence'

const now = new Date('2026-05-13T14:30:00.000Z')

assert.strictEqual(localVoiceDate(now), '2026-05-13')

const started = nextVoicePresenceOnStart(null, now)
assert.ok(started.first_started_at)
assert.strictEqual(started.first_started_at, started.last_started_at)

const intro = buildVoiceStartupPrompt({}, 'manager_led', now)
assert.strictEqual(intro.shouldSpeak, true)
assert.strictEqual(intro.reason, 'first_intro')

const greeted = nextVoicePresenceAfterGreeting(started, now)
assert.strictEqual(greeted.has_seen_intro, true)
assert.strictEqual(greeted.last_greeted_date, '2026-05-13')

const sameDayUserLed = buildVoiceStartupPrompt(greeted, 'creator_led', now)
assert.strictEqual(sameDayUserLed.shouldSpeak, false)

const sameDayDivineLed = buildVoiceStartupPrompt(greeted, 'manager_led', now)
assert.strictEqual(sameDayDivineLed.shouldSpeak, true)
assert.strictEqual(sameDayDivineLed.reason, 'divine_led')

const nextDay = buildVoiceStartupPrompt(greeted, 'creator_led', new Date('2026-05-14T09:00:00.000Z'))
assert.strictEqual(nextDay.shouldSpeak, true)
assert.strictEqual(nextDay.reason, 'first_today')

const afterSpeech = nextVoicePresenceAfterUserSpeech(greeted, now)
assert.strictEqual(afterSpeech.last_user_spoke_at, now.toISOString())

assert.ok(buildPostNavigationPrompt('/dashboard/well-being').includes('/dashboard/well-being'))

console.log('divine voice presence: ok')
