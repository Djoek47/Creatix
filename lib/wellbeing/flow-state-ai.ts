import { z } from 'zod'
import { inferWellbeingState, type MoodId } from '@/lib/wellbeing/infer-mood'
import type { FlowActivitySignals } from '@/lib/wellbeing/flow-activity-signals'
import type { FlowPresenceSignals } from '@/lib/wellbeing/flow-presence-signals'
import {
  awayRecoveryEnergyBonus,
  focusTempoAdjustment,
  idleDrainEnergyPenalty,
  platformStaleStressMultiplier,
  quietDayStressMultiplier,
} from '@/lib/wellbeing/flow-presence-heuristic'

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
  presence?: FlowPresenceSignals | null
}): FlowStatePayload {
  const { signals, glowScore, minutesUntilGolden, compositePressure, presence } = args
  const workDebt = Math.min(
    100,
    signals.protocolOpen * 6 + signals.managerSuggested * 4 + signals.managerScheduled * 3,
  )
  const activityStrain = Math.min(100, compositePressure * 0.55 + workDebt * 0.45)

  let stress = Math.round(Math.min(95, Math.max(8, activityStrain + (100 - glowScore) * 0.12)))
  let energy = Math.round(
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
  let focus = Math.round(
    Math.min(94, Math.max(22, 74 - activityStrain * 0.35 - Math.abs(glowScore - 58) * 0.2)),
  )

  const inv = inferWellbeingState({
    messagePressure: Math.round(compositePressure),
    glowScore,
    minutesUntilGolden,
  })

  const mood = inv.mood as MoodId
  let rationale = `${inv.rationale} Signals include inbox model ${Math.round(compositePressure)}/100, protocol backlog ${signals.protocolOpen}, manager queue ${signals.managerSuggested + signals.managerScheduled}.`
  const goalAlignment =
    signals.goalsText && signals.goalsText !== 'No structured goals saved in Divine Manager yet.'
      ? `Against your goals: ${signals.goalsText.slice(0, 200)}${signals.goalsText.length > 200 ? '…' : ''}`
      : 'Define goals in Divine Manager so load can be interpreted as progress or drift—not noise.'

  if (presence) {
    const away = awayRecoveryEnergyBonus(presence.hoursSinceLastMeaningfulAction)
    const idlePen = idleDrainEnergyPenalty(presence.idleStreakApproxMinutes, presence.heartbeatFresh)
    energy = Math.round(Math.min(92, Math.max(18, energy + away - idlePen)))

    const staleMul = platformStaleStressMultiplier(presence.platformStaleHoursMin)
    if (compositePressure < 88) {
      stress = Math.round(
        Math.min(
          95,
          Math.max(8, stress * quietDayStressMultiplier(presence.meaningfulActionsToday) * staleMul),
        ),
      )
    } else {
      stress = Math.round(Math.min(95, Math.max(8, stress * staleMul)))
    }

    focus = Math.round(
      Math.min(
        94,
        Math.max(
          22,
          focus +
            focusTempoAdjustment({
              idleStreakApproxMinutes: presence.idleStreakApproxMinutes,
              heartbeatFresh: presence.heartbeatFresh,
              interactionMedianGapSec: presence.interactionMedianGapSec,
              compositePressure,
            }),
        ),
      ),
    )

    const engagementBits: string[] = []
    if (presence.hoursSinceLastMeaningfulAction != null && presence.hoursSinceLastMeaningfulAction >= 6) {
      engagementBits.push(
        `About ${Math.round(presence.hoursSinceLastMeaningfulAction)}h since your last meaningful dashboard action.`,
      )
    }
    if (presence.heartbeatFresh && presence.idleStreakApproxMinutes >= 12) {
      engagementBits.push(
        `Foreground idle streak ~${Math.round(presence.idleStreakApproxMinutes)}m while the dashboard was recently active.`,
      )
    }
    if (presence.quietDay && compositePressure < 88) {
      engagementBits.push(`Few meaningful UI actions logged today (UTC); strain is softened slightly vs pure backlog.`)
    }
    if (engagementBits.length) {
      rationale = `${rationale} ${engagementBits.join(' ')}`
    }
  }

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
