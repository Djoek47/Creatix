import { z } from 'zod'
import { generateObject } from 'ai'
import type { GlowInsightsPayload } from '@/lib/wellbeing/types'
import type { PulseRawSignals } from '@/lib/wellbeing/pulse-signals'
import type { FlowPresenceSignals } from '@/lib/wellbeing/flow-presence-signals'
import { heuristicFlowState, type FlowStatePayload } from '@/lib/wellbeing/flow-state-ai'

export const pulseSeveritySchema = z.enum(['steady', 'attend', 'intervene'])
export type PulseSeverity = z.infer<typeof pulseSeveritySchema>

export const pulseSourceSchema = z.object({
  id: z.string(),
  lens: z.enum(['safety', 'reputation', 'operations', 'trajectory', 'rhythm']),
  label: z.string(),
  detail: z.string(),
})

export type PulseSource = z.infer<typeof pulseSourceSchema>

const pulseNarrativeSchema = z.object({
  headline: z.string(),
  narrative: z.string(),
  whyBullets: z.array(z.string()).max(3),
})

export type PulsePayload = {
  schemaVersion: 1
  severity: PulseSeverity
  headline: string
  narrative: string
  whyBullets: string[]
  nextAction: { label: string; href: string }
  sources: PulseSource[]
  flow: FlowStatePayload
  glowScore: number
  minutesUntilGolden: number | null
  insightSentence: string
  computedAt: string
  narrativeSource: 'ai' | 'heuristic'
}

const flowStatePayloadSchema = z.object({
  mood: z.enum(['calm', 'creative', 'charged', 'fragile', 'focused']),
  energy: z.number(),
  stress: z.number(),
  focus: z.number(),
  rationale: z.string(),
  goalAlignment: z.string(),
  messagePressure: z.number(),
  source: z.enum(['ai', 'heuristic']),
})

export const pulsePayloadSchema = z.object({
  schemaVersion: z.literal(1),
  severity: pulseSeveritySchema,
  headline: z.string(),
  narrative: z.string(),
  whyBullets: z.array(z.string()),
  nextAction: z.object({ label: z.string(), href: z.string() }),
  sources: z.array(pulseSourceSchema),
  flow: flowStatePayloadSchema,
  glowScore: z.number(),
  minutesUntilGolden: z.number().nullable(),
  insightSentence: z.string(),
  computedAt: z.string(),
  narrativeSource: z.enum(['ai', 'heuristic']),
})

export type PulsePayloadParsed = z.infer<typeof pulsePayloadSchema>

function deriveSeverity(s: PulseRawSignals): PulseSeverity {
  const { compositePressure, openLeakAlertsDetected, churnHighOrCritical, mentionsUnread, churnMedium } =
    s
  if (openLeakAlertsDetected > 0 || churnHighOrCritical >= 3 || compositePressure >= 88) {
    return 'intervene'
  }
  if (compositePressure >= 72 && (openLeakAlertsDetected > 0 || churnHighOrCritical >= 1)) {
    return 'intervene'
  }
  if (
    compositePressure >= 58 ||
    mentionsUnread >= 4 ||
    churnHighOrCritical >= 1 ||
    churnMedium >= 8
  ) {
    return 'attend'
  }
  return 'steady'
}

function pickNextAction(
  s: PulseRawSignals,
  severity: PulseSeverity,
): { label: string; href: string } {
  if (s.openLeakAlertsDetected > 0) {
    return { label: 'Review Protection', href: '/dashboard/protection' }
  }
  if (s.mentionsUnread >= 3) {
    return { label: 'Review outside voice', href: '/dashboard/mentions' }
  }
  if (s.churnHighOrCritical >= 1) {
    return { label: 'Review retention signals', href: '/dashboard/retention/churn' }
  }
  if (s.flow.inboxUnreadTotal >= 25 || s.compositePressure >= 60) {
    return { label: 'Triage inbox', href: '/dashboard/messages' }
  }
  if (severity !== 'steady') {
    return { label: 'Open Well-being', href: '/dashboard/well-being' }
  }
  return { label: 'Adjust goals in Divine Manager', href: '/dashboard/divine-manager' }
}

function buildSources(raw: PulseRawSignals, glow: Pick<GlowInsightsPayload, 'insightSentence' | 'glowScore'>): PulseSource[] {
  const sources: PulseSource[] = [
    {
      id: 'ops',
      lens: 'operations',
      label: 'Operational load',
      detail: `Composite load about ${Math.round(raw.compositePressure)}/100 · ${raw.flow.inboxUnreadTotal} unread threads · ${raw.flow.protocolOpen} open protocol tasks · ${raw.flow.managerSuggested + raw.flow.managerScheduled} manager items.`,
    },
    {
      id: 'safety',
      lens: 'safety',
      label: 'Exposure & safety',
      detail:
        raw.openLeakAlertsDetected > 0
          ? `${raw.openLeakAlertsDetected} open leak alert${raw.openLeakAlertsDetected === 1 ? '' : 's'} awaiting triage in Protection.`
          : 'No open leak alerts in detected state.',
    },
    {
      id: 'reputation',
      lens: 'reputation',
      label: 'Outside voice',
      detail:
        raw.mentionsUnread > 0
          ? `${raw.mentionsUnread} unread mention${raw.mentionsUnread === 1 ? '' : 's'} · ${raw.mentionsRecent7d} total in the last 7 days.`
          : `Mentions are clear (${raw.mentionsRecent7d} recorded in the last 7 days).`,
    },
    {
      id: 'trajectory',
      lens: 'trajectory',
      label: 'Momentum vs goals',
      detail:
        raw.churnHighOrCritical + raw.churnMedium > 0
          ? `${raw.churnHighOrCritical} fan${raw.churnHighOrCritical === 1 ? '' : 's'} marked high or critical churn risk · ${raw.churnMedium} at medium risk.`
          : 'No elevated churn buckets in your latest fan snapshots.',
    },
    {
      id: 'rhythm',
      lens: 'rhythm',
      label: 'Light & timing',
      detail: `Glow score ${glow.glowScore}/100. ${glow.insightSentence}`,
    },
  ]
  return sources
}

function heuristicNarrative(
  raw: PulseRawSignals,
  severity: PulseSeverity,
  flow: FlowStatePayload,
): z.infer<typeof pulseNarrativeSchema> {
  const load = Math.round(raw.compositePressure)
  const headlines: Record<PulseSeverity, string> = {
    steady: 'Steady rhythm',
    attend: 'Time to attend',
    intervene: 'Intervention suggested',
  }
  let narrative = `We’re seeing a composite load of about ${load}/100 with ${raw.flow.inboxUnreadTotal} unread threads. `
  if (severity === 'steady') {
    narrative +=
      'Nothing is flashing critical in safety or reputation queues relative to your usual operating pattern.'
  } else if (severity === 'attend') {
    narrative +=
      'A few lanes need attention soon—mentions, inbox depth, or churn snapshots merit a short review before they stack.'
  } else {
    narrative +=
      'Protection or workload signals are sharp enough that a focused pass now will cost less than waiting.'
  }
  narrative += ` ${flow.rationale.slice(0, 280)}${flow.rationale.length > 280 ? '…' : ''}`

  const bullets: string[] = []
  if (raw.openLeakAlertsDetected > 0) {
    bullets.push(`${raw.openLeakAlertsDetected} leak alert(s) still in detected status.`)
  }
  if (raw.mentionsUnread >= 2) {
    bullets.push(`${raw.mentionsUnread} unread mention(s) in reputation monitoring.`)
  }
  if (raw.churnHighOrCritical >= 1) {
    bullets.push(`${raw.churnHighOrCritical} fan(s) tagged high or critical churn risk.`)
  }
  if (bullets.length === 0) {
    bullets.push(`Protocol + manager workload: ${raw.flow.protocolOpen} protocol, ${raw.flow.managerSuggested + raw.flow.managerScheduled} manager tasks.`)
  }
  if (bullets.length < 3 && load >= 55) {
    bullets.push(`Composite load is elevated (${load}/100)—batch triage will help.`)
  }
  if (bullets.length < 3) {
    bullets.push(flow.goalAlignment.slice(0, 200) + (flow.goalAlignment.length > 200 ? '…' : ''))
  }

  return {
    headline: headlines[severity],
    narrative: narrative.trim(),
    whyBullets: bullets.slice(0, 3),
  }
}

function buildPromptFacts(
  raw: PulseRawSignals,
  severity: PulseSeverity,
  flow: FlowStatePayload,
  presence?: FlowPresenceSignals | null,
) {
  let presenceBlock = ''
  if (process.env.FLOW_V2_LLM === '1' && presence) {
    presenceBlock = `
Presence / engagement (UTC day bucket for actions):
- Hours since last meaningful dashboard action: ${presence.hoursSinceLastMeaningfulAction == null ? 'unknown' : `${Math.round(presence.hoursSinceLastMeaningfulAction * 10) / 10}h`}
- Foreground heartbeat fresh (≈5m window): ${presence.heartbeatFresh ? 'yes' : 'no'}
- Approx idle streak while heartbeat fresh: ${Math.round(presence.idleStreakApproxMinutes)}m
- Meaningful UI actions today (UTC): ${presence.meaningfulActionsToday}; quiet-day relief eligible: ${presence.quietDay ? 'yes' : 'no'}
- Platform staleness (worst connected sync age, hours): ${presence.platformStaleHoursMin == null ? 'unknown' : `${Math.round(presence.platformStaleHoursMin * 10) / 10}h`}
`
  }

  return `Severity (fixed, do not change): ${severity}

Facts:
- Composite load index: ${Math.round(raw.compositePressure)}/100
- Unread threads: ${raw.flow.inboxUnreadTotal}; active (24h): ${raw.flow.activeThreads24h}
- Protocol open: ${raw.flow.protocolOpen}; manager suggested: ${raw.flow.managerSuggested}; scheduled: ${raw.flow.managerScheduled}
- Open leak alerts (detected): ${raw.openLeakAlertsDetected}
- Unread mentions: ${raw.mentionsUnread}; mentions last 7d: ${raw.mentionsRecent7d}
- Churn high/critical fans: ${raw.churnHighOrCritical}; medium: ${raw.churnMedium}
- Flow heuristic: mood ${flow.mood}, stress ${flow.stress}/100, energy ${flow.energy}/100
${presenceBlock}
Write a headline (max 8 words), one short observational paragraph (no diagnosis), and at most 3 bullets starting with "We're seeing…" or similar neutral phrasing.`
}

export async function buildPulsePayload(args: {
  raw: PulseRawSignals
  glow: GlowInsightsPayload
  presence?: FlowPresenceSignals | null
}): Promise<PulsePayload> {
  const { raw, glow, presence } = args
  const severity = deriveSeverity(raw)
  const nextAction = pickNextAction(raw, severity)
  const minutesUntilGolden =
    typeof glow.nextGoldenHour?.minutesUntil === 'number' && Number.isFinite(glow.nextGoldenHour.minutesUntil)
      ? glow.nextGoldenHour.minutesUntil
      : null

  const flow = heuristicFlowState({
    signals: raw.flow,
    glowScore: glow.glowScore,
    minutesUntilGolden,
    compositePressure: raw.compositePressure,
    presence: presence ?? null,
  })

  const sources = buildSources(raw, glow)
  let narrativeSource: 'ai' | 'heuristic' = 'heuristic'
  let copy = heuristicNarrative(raw, severity, flow)

  if (process.env.OPENAI_API_KEY) {
    try {
      const { object } = await generateObject({
        model: 'openai/gpt-4o-mini',
        schema: pulseNarrativeSchema,
        system:
          'You help independent creators with occupational wellbeing copy. Observational tone only: "We are seeing…". No medical, psychiatric, or diagnostic claims. No therapy role. Keep headline short.',
        prompt: buildPromptFacts(raw, severity, flow, presence),
      })
      copy = object
      narrativeSource = 'ai'
    } catch {
      // keep heuristic
    }
  }

  return {
    schemaVersion: 1,
    severity,
    headline: copy.headline,
    narrative: copy.narrative,
    whyBullets: copy.whyBullets.slice(0, 3),
    nextAction,
    sources,
    flow,
    glowScore: glow.glowScore,
    minutesUntilGolden,
    insightSentence: glow.insightSentence,
    computedAt: new Date().toISOString(),
    narrativeSource,
  }
}
