/**
 * Builds OpenAI prompts for scripted Divine Manager voice briefings (REST, not Realtime).
 */
import {
  managerTalkativenessVoiceScriptLine,
  normalizeManagerTalkativeness,
} from '@/lib/divine/manager-talkativeness'
import { personalityVoiceScriptLine, resolveVoicePersonality } from '@/lib/divine/voice-personality'
import type { DivineManagerAutomationRules } from '@/lib/divine-manager'

export type VoiceBriefTaskRow = {
  status?: string
  type?: string
  category?: string | null
  payload?: { summary?: unknown } | null
}

export type VoiceBriefMode = 'intro' | 'ongoing' | 'what_next'

export function buildVoiceBriefPrompts(opts: {
  settings: Record<string, unknown>
  tasks: VoiceBriefTaskRow[] | null | undefined
  analytics:
    | { platform?: string; date?: string; fans?: unknown; revenue?: unknown }[]
    | null
    | undefined
  mode: VoiceBriefMode
}): { system: string; userPrompt: string } {
  const { settings } = opts
  const persona = (settings.persona ?? {}) as Record<string, unknown>
  const rules = settings.automation_rules as DivineManagerAutomationRules | Record<string, unknown> | undefined
  const notify = settings.notification_settings as Record<string, unknown> | undefined
  const rulesTyped = rules as DivineManagerAutomationRules | undefined
  const talkLevel = normalizeManagerTalkativeness(
    rulesTyped?.manager_talkativeness ??
      (rules as Record<string, unknown> | undefined)?.manager_talkativeness,
  )
  const voiceP = resolveVoicePersonality((rules ?? {}) as DivineManagerAutomationRules)

  const taskSummary =
    opts.tasks
      ?.slice(0, 10)
      .map(
        (t) =>
          `[${t.status}] ${t.type ?? '?'}${t.category ? ` (${t.category})` : ''}: ${String(t.payload?.summary || '').slice(0, 80)}`,
      )
      .join('\n') || 'No tasks yet.'

  const analyticsSummary =
    opts.analytics && opts.analytics.length
      ? opts.analytics
          .map((row) => `${row.date} ${row.platform}: fans=${row.fans ?? 'n/a'}, revenue=${row.revenue ?? 'n/a'}`)
          .join('\n')
      : 'No recent analytics snapshots.'

  const modeLine =
    opts.mode === 'intro'
      ? 'Give a concise 30 to 60 second style briefing with: key wins, current risks, and the top three things the creator should do today.'
      : opts.mode === 'ongoing'
        ? 'Give one or two brief sentences about any new or changed priorities since last time. If nothing has changed, say that clearly.'
        : 'Give a ranked list of two or three concrete next actions the creator should take right now.'

  const system = `You are the Divine Manager, a Jarvis-style voice companion for a creator.
Speak as a calm, confident manager. Never role-play as the creator, and never claim to have already sent messages or changed prices.
You only describe what you see and what you recommend. Respect boundaries, niches, and platform safety rules.
Avoid explicit or illegal content entirely. The creator may have OnlyFans and/or Fansly connected; when referring to platforms, subscribers, or messages, use these names (OnlyFans, Fansly) so the creator knows which platform you mean.`

  const userPrompt = `Creator persona:
- Tone: ${String(persona.tone ?? 'friendly')}
- Flirty level: ${String(persona.flirtyLevel ?? 'mild')}
- Boundaries: ${Array.isArray(persona.boundaries) ? persona.boundaries.join('; ') || 'none specified' : 'none specified'}

Manager settings:
- Archetype: ${String(settings.manager_archetype || 'hermes')}
- Mode: ${String(settings.mode)}
- Notifications: ${String(notify?.level ?? 'daily_digest')}
- Automation: posts=${rulesTyped?.autoPostSchedule?.enabled ? 'on' : 'off'}, welcomeDM=${rulesTyped?.autoWelcomeDm?.enabled ? 'on' : 'off'}, tipFollowup=${rulesTyped?.autoFollowUpAfterTips?.enabled ? 'on' : 'off'}

Recent tasks:
${taskSummary}

Recent analytics (most recent first):
${analyticsSummary}

Now, in your spoken response:
${modeLine}

${managerTalkativenessVoiceScriptLine(talkLevel)}
${personalityVoiceScriptLine(voiceP)}

Speak directly to the creator, but in second person ("you"). Keep it actionable but advisory, not absolute. Do not read raw JSON or bullet syntax; speak like a human manager.`

  return { system, userPrompt }
}
