import type {
  DivineInterruptionStyle,
  DivineManagerAutomationRules,
  DivineNavigationAutonomy,
  DivineRealtimeReasoningEffort,
  DivineToolNarration,
  DivineVoicePersonalityPresetId,
  DivineVoicePersonalityStored,
} from '@/lib/divine-manager'

export type DivineVoicePersonalityInitiative =
  DivineVoicePersonalityStored['initiative']

export type ResolvedVoicePersonality = DivineVoicePersonalityStored

const DEFAULT_INITIATIVE: DivineVoicePersonalityInitiative = 'balanced'
const DEFAULT_PRESET_ID: DivineVoicePersonalityPresetId = 'balanced_partner'
const DEFAULT_REASONING_EFFORT: DivineRealtimeReasoningEffort = 'low'
const DEFAULT_INTERRUPTION_STYLE: DivineInterruptionStyle = 'balanced'
const DEFAULT_NAVIGATION_AUTONOMY: DivineNavigationAutonomy = 'suggest'
const DEFAULT_TOOL_NARRATION: DivineToolNarration = 'brief'

export type DivineVoicePersonalityPreset = {
  id: DivineVoicePersonalityPresetId
  label: string
  description: string
  personality: ResolvedVoicePersonality
}

/** Matches plan defaults: silence/mic midpoint = current shipped constants */
export function defaultVoicePersonality(): ResolvedVoicePersonality {
  return {
    preset_id: DEFAULT_PRESET_ID,
    talkativeness: 50,
    proactivity: 40,
    initiative: DEFAULT_INITIATIVE,
    reasoning_effort: DEFAULT_REASONING_EFFORT,
    interruption_style: DEFAULT_INTERRUPTION_STYLE,
    navigation_autonomy: DEFAULT_NAVIGATION_AUTONOMY,
    tool_narration: DEFAULT_TOOL_NARRATION,
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

export function normalizeVoicePersonalityPresetId(raw: unknown): DivineVoicePersonalityPresetId {
  if (
    raw === 'quiet_operator' ||
    raw === 'balanced_partner' ||
    raw === 'proactive_manager' ||
    raw === 'studio_director'
  ) {
    return raw
  }
  return DEFAULT_PRESET_ID
}

export function normalizeReasoningEffort(raw: unknown): DivineRealtimeReasoningEffort {
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw
  return DEFAULT_REASONING_EFFORT
}

export function normalizeInterruptionStyle(raw: unknown): DivineInterruptionStyle {
  if (raw === 'fast' || raw === 'balanced' || raw === 'patient') return raw
  return DEFAULT_INTERRUPTION_STYLE
}

export function normalizeNavigationAutonomy(raw: unknown): DivineNavigationAutonomy {
  if (raw === 'ask' || raw === 'suggest' || raw === 'act') return raw
  return DEFAULT_NAVIGATION_AUTONOMY
}

export function normalizeToolNarration(raw: unknown): DivineToolNarration {
  if (raw === 'quiet' || raw === 'brief' || raw === 'statusy') return raw
  return DEFAULT_TOOL_NARRATION
}

export const DIVINE_VOICE_PERSONALITY_PRESETS: DivineVoicePersonalityPreset[] = [
  {
    id: 'quiet_operator',
    label: 'Quiet Operator',
    description: 'Concise, patient, and creator-led for quick check-ins.',
    personality: {
      preset_id: 'quiet_operator',
      talkativeness: 22,
      proactivity: 22,
      initiative: 'creator_led',
      reasoning_effort: 'low',
      interruption_style: 'patient',
      navigation_autonomy: 'ask',
      tool_narration: 'quiet',
      silence_patience: 65,
      mic_pickup: 45,
      pro_mode: false,
    },
  },
  {
    id: 'balanced_partner',
    label: 'Balanced Partner',
    description: 'The default manager voice: helpful, warm, and measured.',
    personality: defaultVoicePersonality(),
  },
  {
    id: 'proactive_manager',
    label: 'Proactive Manager',
    description: 'Plans ahead, batches safe work, and gives short status updates.',
    personality: {
      preset_id: 'proactive_manager',
      talkativeness: 62,
      proactivity: 78,
      initiative: 'manager_led',
      reasoning_effort: 'high',
      interruption_style: 'fast',
      navigation_autonomy: 'act',
      tool_narration: 'statusy',
      silence_patience: 45,
      mic_pickup: 55,
      pro_mode: true,
    },
  },
  {
    id: 'studio_director',
    label: 'Studio Director',
    description: 'Content-focused guidance for photos, captions, timing, and posts.',
    personality: {
      preset_id: 'studio_director',
      talkativeness: 68,
      proactivity: 70,
      initiative: 'manager_led',
      reasoning_effort: 'high',
      interruption_style: 'balanced',
      navigation_autonomy: 'act',
      tool_narration: 'brief',
      silence_patience: 55,
      mic_pickup: 55,
      pro_mode: true,
    },
  },
]

export function voicePersonalityPresetById(
  id: DivineVoicePersonalityPresetId,
): DivineVoicePersonalityPreset {
  return (
    DIVINE_VOICE_PERSONALITY_PRESETS.find((preset) => preset.id === id) ??
    DIVINE_VOICE_PERSONALITY_PRESETS[1] ??
    DIVINE_VOICE_PERSONALITY_PRESETS[0]
  )
}

export function applyVoicePersonalityPreset(
  current: ResolvedVoicePersonality,
  id: DivineVoicePersonalityPresetId,
): ResolvedVoicePersonality {
  const preset = voicePersonalityPresetById(id).personality
  return {
    ...current,
    ...preset,
    preset_id: id,
  }
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
    preset_id: normalizeVoicePersonalityPresetId(vp.preset_id),
    talkativeness:
      vp.talkativeness !== undefined
        ? clampPersonalityNumeric(vp.talkativeness, def.talkativeness)
        : legacyTalkativenessToSlider(legacy),
    proactivity: clampPersonalityNumeric(vp.proactivity, def.proactivity),
    initiative: normalizeInitiative(vp.initiative),
    reasoning_effort: normalizeReasoningEffort(vp.reasoning_effort),
    interruption_style: normalizeInterruptionStyle(vp.interruption_style),
    navigation_autonomy: normalizeNavigationAutonomy(vp.navigation_autonomy),
    tool_narration: normalizeToolNarration(vp.tool_narration),
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

function realtime2ControlBlock(p: ResolvedVoicePersonality): string {
  const preset = voicePersonalityPresetById(normalizeVoicePersonalityPresetId(p.preset_id))
  const reasoning = normalizeReasoningEffort(p.reasoning_effort)
  const autonomy = normalizeNavigationAutonomy(p.navigation_autonomy)
  const narration = normalizeToolNarration(p.tool_narration)
  const interruption = normalizeInterruptionStyle(p.interruption_style)
  let s = `\nRealtime 2 harness preferences: preset=${preset.label}; reasoning=${reasoning}; interruption=${interruption}; navigation=${autonomy}; tool narration=${narration}.`
  if (autonomy === 'ask') {
    s += '\nNavigation autonomy: ask before moving the creator to a new app area unless they explicitly requested the destination.'
  } else if (autonomy === 'act') {
    s += '\nNavigation autonomy: for safe reads, app setup, and dashboard navigation, act directly and explain in one short line. Still ask before irreversible or external actions.'
  } else {
    s += '\nNavigation autonomy: suggest the destination first when intent is ambiguous; direct navigation is fine when the creator clearly asks for it.'
  }
  if (narration === 'quiet') {
    s += '\nTool narration: keep tool-running chatter minimal; speak when the result is ready or a confirmation is needed.'
  } else if (narration === 'statusy') {
    s += '\nTool narration: give compact status updates while batching safe tools, then summarize what changed.'
  } else {
    s += '\nTool narration: brief status lines are okay when a tool takes more than a moment.'
  }
  return s
}

export function personalityRealtimeBlock(p: ResolvedVoicePersonality): string {
  let s = `\nCreator personality preferences (applied on top of base talk rules):`
  s += initiativeBlock(p)
  s += proactivityBands(p)
  const tband = talkativenessBands(p)
  if (tband) s += tband
  s += realtime2ControlBlock(p)
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
