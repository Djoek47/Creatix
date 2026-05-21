import type { GlowInsightsPayload } from '@/lib/wellbeing/types'

export const MOOD_IDS = ['calm', 'creative', 'charged', 'fragile', 'focused'] as const
export type MoodId = (typeof MOOD_IDS)[number]

export type InferredWellbeing = {
  mood: MoodId
  energy: number
  stress: number
  focus: number
  rationale: string
}

/**
 * Derives mood + sliders from message pressure, glow score, and golden-hour proximity.
 * Stress slider internal value: FluidMeter uses `reverse` so displayed stress = 100 - stress.
 */
export function inferWellbeingState(args: {
  messagePressure: number
  glowScore: number
  minutesUntilGolden: number | null
}): InferredWellbeing {
  const { messagePressure: p, glowScore: g, minutesUntilGolden: golden } = args

  const pressure01 = Math.min(1, Math.max(0, p / 100))
  const glow01 = Math.min(1, Math.max(0, g / 100))

  const stressDisplay = Math.round(
    Math.min(95, Math.max(8, p * 0.82 + (1 - glow01) * 28 + (g < 42 ? 12 : 0))),
  )
  const stress = 100 - stressDisplay

  const energy = Math.round(
    Math.min(92, Math.max(18, g * 0.52 + (100 - p) * 0.38 + (golden != null && golden <= 120 ? 8 : 0))),
  )

  const focus = Math.round(
    Math.min(94, Math.max(22, 72 - pressure01 * 38 - Math.abs(g - 58) * 0.22)),
  )

  let mood: MoodId = 'calm'
  let rationale = ''

  if (p >= 68 || g < 38) {
    mood = 'fragile'
    rationale =
      p >= 68
        ? 'Inbox load looks heavy—we’re leaning fragile. Adjust if that’s not how it feels.'
        : 'Glow readout is soft and load is present—leaning fragile unless you say otherwise.'
  } else if (p >= 52) {
    mood = 'focused'
    rationale = 'Pressure is up but manageable—guessing you’re in heads-down mode.'
  } else if (golden != null && golden <= 150 && golden >= 0 && g >= 48 && p >= 28 && p < 62) {
    mood = 'charged'
    rationale = 'Golden window is near and energy looks workable—marking this as charged.'
  } else if (g >= 64 && p <= 42) {
    mood = 'creative'
    rationale = 'Glow is strong and the inbox is quieter—leaning creative.'
  } else if (p <= 36 && g >= 52) {
    mood = 'calm'
    rationale = 'Load is light and the readout looks steady—defaulting to calm.'
  } else {
    mood = 'calm'
    rationale = 'Blended signals point to calm; use the chips if we misread you.'
  }

  return { mood, energy, stress, focus, rationale }
}

export function inferFromInsight(
  messagePressure: number,
  insight: GlowInsightsPayload | null,
): InferredWellbeing {
  const glowScore = insight?.glowScore ?? 52
  const minutesUntilGolden =
    insight?.nextGoldenHour && typeof insight.nextGoldenHour.minutesUntil === 'number'
      ? insight.nextGoldenHour.minutesUntil
      : null
  return inferWellbeingState({ messagePressure, glowScore, minutesUntilGolden })
}
