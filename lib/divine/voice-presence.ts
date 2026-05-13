import type { DivineVoicePersonalityInitiative } from '@/lib/divine-manager'
import type { DivineVoicePresence } from '@/lib/divine/voice-memory-types'

export type VoiceStartupPromptDecision = {
  shouldSpeak: boolean
  reason: 'first_intro' | 'first_today' | 'divine_led' | 'quiet'
  prompt: string | null
}

export function localVoiceDate(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function elapsedLine(iso: string | undefined, now: Date): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60_000))
  if (mins < 2) return ' You spoke with me just now.'
  if (mins < 60) return ` It has been about ${mins} minutes since you last spoke with me.`
  const hours = Math.round(mins / 60)
  if (hours < 24) return ` It has been about ${hours} hours since you last spoke with me.`
  const days = Math.round(hours / 24)
  return ` It has been about ${days} days since you last spoke with me.`
}

export function buildVoiceStartupPrompt(
  presence: DivineVoicePresence | null | undefined,
  initiative: DivineVoicePersonalityInitiative,
  now = new Date(),
): VoiceStartupPromptDecision {
  const today = localVoiceDate(now)
  const p = presence ?? {}
  const since = elapsedLine(p.last_user_spoke_at, now)

  if (!p.has_seen_intro || !p.first_started_at) {
    return {
      shouldSpeak: true,
      reason: 'first_intro',
      prompt:
        `Introduce yourself as Divine in one warm sentence, then explain that you can navigate the dashboard, read context, draft safely, and ask for confirmation before risky actions.${since} Ask what they want to handle first.`,
    }
  }

  if (p.last_greeted_date !== today) {
    return {
      shouldSpeak: true,
      reason: 'first_today',
      prompt:
        `Give a brief first-check-in-today greeting as Divine.${since} Offer one useful starting point from today's plan, messages, protection, retention, or content, then ask where they want to begin.`,
    }
  }

  if (initiative === 'manager_led') {
    return {
      shouldSpeak: true,
      reason: 'divine_led',
      prompt:
        `Open proactively as Divine with a short live-manager greeting.${since} State one concise next step you can take now, then invite them to redirect you.`,
    }
  }

  return {
    shouldSpeak: false,
    reason: 'quiet',
    prompt: null,
  }
}

export function nextVoicePresenceOnStart(
  presence: DivineVoicePresence | null | undefined,
  now = new Date(),
): DivineVoicePresence {
  const iso = now.toISOString()
  return {
    ...(presence ?? {}),
    first_started_at: presence?.first_started_at ?? iso,
    last_started_at: iso,
  }
}

export function nextVoicePresenceAfterGreeting(
  presence: DivineVoicePresence | null | undefined,
  now = new Date(),
): DivineVoicePresence {
  return {
    ...(presence ?? {}),
    has_seen_intro: true,
    last_divine_spoke_at: now.toISOString(),
    last_greeted_date: localVoiceDate(now),
  }
}

export function nextVoicePresenceAfterUserSpeech(
  presence: DivineVoicePresence | null | undefined,
  now = new Date(),
): DivineVoicePresence {
  return {
    ...(presence ?? {}),
    last_user_spoke_at: now.toISOString(),
  }
}

export function buildPostNavigationPrompt(path: string): string {
  const label = path
    .replace(/^\/dashboard\/?/, '')
    .replace(/[-?=&_/]+/g, ' ')
    .trim() || 'dashboard'
  return `You just navigated the creator to ${path}. Continue immediately: briefly explain the ${label} page, what they can do here, and the next safe step. If a risky or external action is needed, ask before execution.`
}
