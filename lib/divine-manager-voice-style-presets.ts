import type { DivineManagerPersona } from '@/lib/divine-manager'

/** Single control for tone × flirt — avoids asking the same question twice. */
export const DIVINE_VOICE_STYLE_PRESETS = [
  {
    id: 'warm_clear',
    title: 'Warm & clear',
    subtitle: 'Kind and direct. No flirt.',
    tone: 'friendly',
    flirtyLevel: 'none' as const,
  },
  {
    id: 'warm_playful',
    title: 'Warm & playful',
    subtitle: 'Friendly with a light flirt.',
    tone: 'friendly',
    flirtyLevel: 'mild' as const,
  },
  {
    id: 'playful',
    title: 'Playful & teasing',
    subtitle: 'Teasing energy, still safe.',
    tone: 'playful',
    flirtyLevel: 'moderate' as const,
  },
  {
    id: 'bold_flirt',
    title: 'Bold & flirty',
    subtitle: 'High heat when it fits.',
    tone: 'playful',
    flirtyLevel: 'high' as const,
  },
  {
    id: 'professional',
    title: 'Concise & professional',
    subtitle: 'Businesslike, predictable.',
    tone: 'professional',
    flirtyLevel: 'none' as const,
  },
  {
    id: 'casual',
    title: 'Casual & easy',
    subtitle: 'Relaxed chats, subtle warmth.',
    tone: 'casual',
    flirtyLevel: 'mild' as const,
  },
  {
    id: 'cold_cutting',
    title: 'Cool & cutting',
    subtitle: 'Dry precision—warmth optional, never cruel.',
    tone: 'cool_surgical',
    flirtyLevel: 'none' as const,
  },
  {
    id: 'commanding_firm',
    title: 'Commanding & firm',
    subtitle: 'Short directives; respect and consent stay absolute.',
    tone: 'commanding',
    flirtyLevel: 'none' as const,
  },
  {
    id: 'frost_playful',
    title: 'Frosty & wicked',
    subtitle: 'Aloof wit, laser boundaries, a hint of mischief.',
    tone: 'reserved_stern',
    flirtyLevel: 'mild' as const,
  },
  {
    id: 'protocol_first',
    title: 'Protocols first',
    subtitle: 'Rules out front; praise when they follow through.',
    tone: 'structured_firm',
    flirtyLevel: 'moderate' as const,
  },
  {
    id: 'devoted_attentive',
    title: 'Devoted & attentive',
    subtitle: 'Soft deference—you lead, they support the vibe.',
    tone: 'attentive_devoted',
    flirtyLevel: 'mild' as const,
  },
  {
    id: 'charged_dynamic',
    title: 'Charged & adaptive',
    subtitle: 'Reads cues and tension—escalates only when the thread invites it.',
    tone: 'responsive_intimate',
    flirtyLevel: 'high' as const,
  },
  {
    id: 'dominant_cold_mean',
    title: 'Dominant & cold-mean',
    subtitle: 'Icy, selective dominance—mean-hot in voice, never mean to people or your hard lines.',
    tone: 'dominant_sharp',
    flirtyLevel: 'mild' as const,
  },
  {
    id: 'kink_consent_first',
    title: 'Kink-aware & consent-first',
    subtitle: 'Edgy themes only with clear opt-in; checks in, safewords respected, boundaries absolute.',
    tone: 'consent_forward',
    flirtyLevel: 'moderate' as const,
  },
] as const

export type DivineVoiceStylePresetId = (typeof DIVINE_VOICE_STYLE_PRESETS)[number]['id']

export function divineVoicePresetIdForPersona(persona: DivineManagerPersona): DivineVoiceStylePresetId | null {
  const t = persona.tone ?? 'friendly'
  const f = persona.flirtyLevel ?? 'mild'
  const row = DIVINE_VOICE_STYLE_PRESETS.find((p) => p.tone === t && p.flirtyLevel === f)
  return row ? row.id : null
}

export function divineVoiceLabelForPersona(persona: DivineManagerPersona): string {
  const id = divineVoicePresetIdForPersona(persona)
  if (id) {
    const p = DIVINE_VOICE_STYLE_PRESETS.find((row) => row.id === id)
    if (p) return p.title
  }
  const tone = persona.tone ?? 'friendly'
  const flirt = persona.flirtyLevel ?? 'mild'
  return `${tone} · ${flirt}`
}
