import { z } from 'zod'
import { inferWellbeingState, type MoodId } from '@/lib/wellbeing/infer-mood'
import type { FlowActivitySignals } from '@/lib/wellbeing/flow-activity-signals'

export const flowStateResponseSchema = z.object({
  mood: z.enum(['calm', 'creative', 'charged', 'fragile', 'focused']),
  energy: z.number().min(0).max(100),
  /** Subjective stress / strain (higher = more load). */
  stress: z.number().min(0).max(100),
  focus: z.number().min(0).max(100),
  rationale: z
    .string()
    .describe('Two short sentences: what the model infers from activity + environment, neutral tone.'),
  goalAlignment: z
    .string()
    .describe('One sentence tying current workload to stated goals (progress vs strain).'),
})

export type FlowStateAiFields = z.infer<typeof flowStateResponseSchema>

export type FlowStatePayload = FlowStateAiFields & {
  messagePressure: number
  source: 'ai' | 'heuristic'
}

export function heuristicFlowState(args: {
  signals: FlowActivitySignals
  glowScore: number
  minutesUntilGolden: number | null
  compositePressure: number
}): FlowStatePayload {
  const { signals, glowScore, minutesUntilGolden, compositePressure } = args
  const workDebt = Math.min(
    100,
    signals.protocolOpen * 6 + signals.managerSuggested * 4 + signals.managerScheduled * 3,
  )
  const activityStrain = Math.min(100, compositePressure * 0.55 + workDebt * 0.45)

  const stress = Math.round(Math.min(95, Math.max(8, activityStrain + (100 - glowScore) * 0.12)))
  const energy = Math.round(
    Math.min(
      92,
      Math.max(
        18,
        glowScore * 0.55 +
          (100 - activityStrain) * 0.35 +
          (minutesUntilGolden != null && minutesUntilGolden <= 120 ? 6 : 0),
      ),
    ),
  )
  const focus = Math.round(
    Math.min(94, Math.max(22, 74 - activityStrain * 0.35 - Math.abs(glowScore - 58) * 0.2)),
  )

  const inv = inferWellbeingState({
    messagePressure: Math.round(compositePressure),
    glowScore,
    minutesUntilGolden,
  })

  const mood = inv.mood as MoodId
  const rationale = `${inv.rationale} Signals include inbox model ${Math.round(compositePressure)}/100, protocol backlog ${signals.protocolOpen}, manager queue ${signals.managerSuggested + signals.managerScheduled}.`
  const goalAlignment =
    signals.goalsText && signals.goalsText !== 'No structured goals saved in Divine Manager yet.'
      ? `Against your goals: ${signals.goalsText.slice(0, 200)}${signals.goalsText.length > 200 ? '…' : ''}`
      : 'Define goals in Divine Manager so load can be interpreted as progress or drift—not noise.'

  return {
    mood,
    energy,
    stress,
    focus,
    rationale,
    goalAlignment,
    messagePressure: Math.round(compositePressure),
    source: 'heuristic',
  }
}
