import type { DivineManagerAutomationRules, DivineVoicePersonalityStored } from '@/lib/divine-manager'

export type DivineVoicePersonalityInitiative =
  DivineVoicePersonalityStored['initiative']

export type ResolvedVoicePersonality = DivineVoicePersonalityStored

const DEFAULT_INITIATIVE: DivineVoicePersonalityInitiative = 'balanced'

/** Matches plan defaults: silence/mic midpoint = current shipped constants */
export function defaultVoicePersonality(): ResolvedVoicePersonality {
  return {
    talkativeness: 50,
    proactivity: 40,
    initiative: DEFAULT_INITIATIVE,
    silence_patience: 50,
    mic_pickup: 50,
    pro_mode: false,
  }
}

export function clampPersonalityNumeric(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function legacyTalkativenessToSlider(
  legacy: DivineManagerAutomationRules['manager_talkativeness'],
): number {
  if (legacy === 'low') return 20
  if (legacy === 'high') return 80
  return 50
}

function normalizeInitiative(raw: unknown): DivineVoicePersonalityInitiative {
  if (raw === 'creator_led' || raw === 'manager_led') return raw
  return DEFAULT_INITIATIVE
}

/** Resolve stored rules + legacy manager_talkativeness into a full persona object (defaults = current product behavior). */
export function resolveVoicePersonality(
  rules: DivineManagerAutomationRules | Record<string, unknown> | null | undefined,
): ResolvedVoicePersonality {
  const def = defaultVoicePersonality()
  if (!rules || typeof rules !== 'object') return def

  const vp = rules.voice_personality as Partial<DivineVoicePersonalityStored> | undefined
  const legacy = rules.manager_talkativeness as DivineManagerAutomationRules['manager_talkativeness']

  if (!vp || typeof vp !== 'object') {
    return {
      ...def,
      talkativeness: legacyTalkativenessToSlider(legacy),
    }
  }

  return {
    talkativeness:
      vp.talkativeness !== undefined
        ? clampPersonalityNumeric(vp.talkativeness, def.talkativeness)
        : legacyTalkativenessToSlider(legacy),
    proactivity: clampPersonalityNumeric(vp.proactivity, def.proactivity),
    initiative: normalizeInitiative(vp.initiative),
    silence_patience: clampPersonalityNumeric(vp.silence_patience, def.silence_patience),
    mic_pickup: clampPersonalityNumeric(vp.mic_pickup, def.mic_pickup),
    pro_mode: vp.pro_mode === true,
  }
}

/** Map slider 0–100 to legacy enum for DB back-compat whenever voice_personality is saved. */
export function talkativenessToLegacyEnum(
  talkativeness: number,
): DivineManagerAutomationRules['manager_talkativeness'] {
  const t = clampPersonalityNumeric(talkativeness, 50)
  if (t < 37) return 'low'
  if (t > 73) return 'high'
  return 'balanced'
}

/** Merge full personality into automation rules and sync legacy manager_talkativeness. */
export function applyVoicePersonalityToAutomationRules(
  base: DivineManagerAutomationRules,
  personality: ResolvedVoicePersonality,
): DivineManagerAutomationRules {
  return {
    ...base,
    voice_personality: { ...personality },
    manager_talkativeness: talkativenessToLegacyEnum(personality.talkativeness),
  }
}

function talkativenessBands(p: ResolvedVoicePersonality): string {
  const t = p.talkativeness
  if (t < 37) {
    return '\nTalkativeness tuning (slider): Extremely concise—economy of words. One idea per utterance unless they ask for more.'
  }
  if (t > 73) {
    return '\nTalkativeness tuning (slider): Richer verbal framing—warm transitions, vivid but short context when it helps empathy. Never ramble; still conversational.'
  }
  return ''
}

function proactivityBands(p: ResolvedVoicePersonality): string {
  const x = p.proactivity
  if (x < 35) {
    return '\nProactivity tuning (slider): Stay reactive—after each answer pause for their cue. Prefer questions over unsolicited plans. During tools stay quiet until they prompt you.'
  }
  if (x > 65) {
    return '\nProactivity tuning (slider): Be forward—in multi-step work, briefly narrate what you will do BEFORE tools and give a SHORT status line after each major beat. Between topics, proactively offer ONE next best suggestion (still advisory—never imply sends or pricing changes succeeded without confirmation flow). Risky sends/mass DM/publish always stay app-confirmed.'
  }
  return '\nProactivity tuning (slider): Balanced—you may offer one succinct next-step idea when genuinely helpful.'
}

function initiativeBlock(p: ResolvedVoicePersonality): string {
  if (p.initiative === 'creator_led') {
    return '\nInitiative (creator-led): OPEN by asking ONE short agenda question (e.g. "What should we tackle first?" or "What\'s top of mind today?"). Let them steer; ask at most one tight clarifying question before running tools.'
  }
  if (p.initiative === 'manager_led') {
    return '\nInitiative (manager-led): OPEN by stating a prioritized 1–3 item micro-plan for right now based on Today\'s Plan and recent tasks, THEN recommend starting with ONE concrete first step. Invite them to veto or reorder; stay advisory.'
  }
  return '\nInitiative (balanced mix): Alternate—when idle, EITHER ask briefly what matters most OR proactively suggest ONE best next priority if context is obvious; keep it succinct.'
}

export function personalityRealtimeBlock(p: ResolvedVoicePersonality): string {
  let s = `\nCreator personality preferences (applied on top of base talk rules):`
  s += initiativeBlock(p)
  s += proactivityBands(p)
  const tband = talkativenessBands(p)
  if (tband) s += tband
  s +=
    '\nSafety: Mass DM, content publish, queue publish, risky pricing—or anything that gates on app confirmation—never skip confirmation; summarize results honestly and never imply auto-send succeeded unless the tool confirms user approval.'
  return s
}

export function personalityChatSuffix(p: ResolvedVoicePersonality): string {
  let s = ''
  if (p.initiative === 'creator_led') {
    s += '\nPrefer asking what they want addressed before prescribing a long roadmap.'
  } else if (p.initiative === 'manager_led') {
    s += '\nPrefer leading with suggested priorities—but keep paragraphs tight unless they ask for detail.'
  }
  if (p.proactivity > 65) {
    s += '\nWhen tools finished, proactively suggest one plausible next optional action—but never fabricate confirmations.'
  } else if (p.proactivity < 35) {
    s += '\nMinimize unprompted suggestions; mirror their framing.'
  }
  if (p.talkativeness < 37) {
    s += '\nKeep textual replies brisk.'
  } else if (p.talkativeness > 73) {
    s += '\nAllow slightly fuller synthesis after tools—but avoid dumping raw payloads.'
  }
  return s
}

export function personalityVoiceScriptLine(p: ResolvedVoicePersonality): string {
  const agenda =
    p.initiative === 'creator_led'
      ? 'Open inviting their priority in one clause.'
      : p.initiative === 'manager_led'
        ? 'Open with a succinct three-bullet style plan voiced as short sentences.'
        : 'Brief warm opener adaptable to whichever suits the script mode.'
  const energy =
    p.proactivity > 65
      ? 'Layer light forward-driving language between beats.'
      : p.proactivity < 35
        ? 'Prefer minimal connective phrases; tighten lists.'
        : 'Natural conversational pivots.'
  const verbosity =
    p.talkativeness < 37 ? 'Ultra-compact pacing.' : p.talkativeness > 73 ? 'Slightly fuller cadence—not a sermon.' : 'Balanced pacing.'
  return `${agenda} ${energy} ${verbosity}`
}

export function getMicThreshold(pickup0to100: number): number {
  const x = clampPersonalityNumeric(pickup0to100, 50)
  if (x <= 50) {
    return Math.round(32 + (x / 50) * (22 - 32))
  }
  return Math.round(22 + ((x - 50) / 50) * (14 - 22))
}
