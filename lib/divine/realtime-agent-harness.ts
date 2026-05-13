import type { ResolvedVoicePersonality } from '@/lib/divine/voice-personality'
import {
  isRiskyAppActionTool,
  isSafeParallelAppActionTool,
  REGISTERED_DASHBOARD_ROUTES,
} from '@/lib/divine/app-action-registry'
import {
  normalizeInterruptionStyle,
  normalizeNavigationAutonomy,
  normalizeReasoningEffort,
  normalizeToolNarration,
} from '@/lib/divine/voice-personality'

export type RealtimeToolSafety =
  | 'safe_parallel'
  | 'safe_serial'
  | 'risky_serial'
  | 'session_control'

export type RealtimeToolCallLike = {
  name?: string
}

export type OrderedRealtimeToolCalls<T extends RealtimeToolCallLike> = {
  parallel: T[]
  serial: T[]
  endCall: T[]
}

const SESSION_CONTROL_TOOLS = new Set<string>(['end_call', 'voice_allow_user_hangup'])

const SAFE_SERIAL_TOOLS = new Set<string>([
  'add_protocol_task',
  'mark_protocol_task_done',
  'divine_crm_notifications_mark_read',
  'divine_crm_notifications_remove',
  'run_leak_scan',
  'run_reputation_scan',
  'trigger_reputation_briefing',
  'refresh_fan_thread_scan',
  'refresh_comment_analysis',
  'sync_commenter_from_posts',
  'draft_fan_reply',
  'run_ai_studio_tool',
  'apply_dashboard_preset',
  'add_reputation_identity',
  'remove_reputation_identity',
  'add_leak_search_identity',
  'remove_leak_search_identity',
])

export function classifyRealtimeToolSafety(name: string | undefined | null): RealtimeToolSafety {
  if (!name) return 'safe_serial'
  if (SESSION_CONTROL_TOOLS.has(name)) return 'session_control'
  if (isRiskyAppActionTool(name)) return 'risky_serial'
  if (isSafeParallelAppActionTool(name)) return 'safe_parallel'
  if (SAFE_SERIAL_TOOLS.has(name)) return 'safe_serial'
  return 'safe_serial'
}

export function orderRealtimeToolCalls<T extends RealtimeToolCallLike>(
  calls: readonly T[],
): OrderedRealtimeToolCalls<T> {
  const ordered: OrderedRealtimeToolCalls<T> = {
    parallel: [],
    serial: [],
    endCall: [],
  }

  for (const call of calls) {
    if (call.name === 'end_call') {
      ordered.endCall.push(call)
      continue
    }
    const safety = classifyRealtimeToolSafety(call.name)
    if (safety === 'safe_parallel') {
      ordered.parallel.push(call)
    } else {
      ordered.serial.push(call)
    }
  }

  return ordered
}

export function realtimeReasoningEffortForPersonality(
  personality: ResolvedVoicePersonality,
): 'low' | 'medium' | 'high' {
  const explicit = normalizeReasoningEffort(personality.reasoning_effort)
  if (explicit !== 'medium') return explicit
  if (personality.proactivity >= 72 || normalizeNavigationAutonomy(personality.navigation_autonomy) === 'act') {
    return 'high'
  }
  if (personality.talkativeness <= 28 && personality.proactivity <= 35) return 'low'
  return 'medium'
}

function realtimeTurnDetectionForPersonality(personality: ResolvedVoicePersonality) {
  const interruption = normalizeInterruptionStyle(personality.interruption_style)
  const eagerness =
    interruption === 'fast' ? 'high' : interruption === 'patient' ? 'low' : 'medium'
  return {
    type: 'semantic_vad',
    eagerness,
    create_response: true,
    interrupt_response: interruption !== 'patient',
  }
}

function appActionRegistryBlock(): string {
  return `\nAudited app-action registry:\n- Safe dashboard navigation routes: ${[
    ...REGISTERED_DASHBOARD_ROUTES,
  ].join(', ')}.\n- Safe automation coverage: read stats, inspect fans, open messages, draft replies, fill composers, create tasks, run scans, open dashboard routes, and set up UI context.\n- Confirmation required before irreversible or externally visible actions: mass DMs, direct sends, publishing, pricing changes, DMCA filing, billing/account changes, or deleting platform data.`
}

function capabilityProfilesBlock(): string {
  return `\nAgent harness capability profiles:\n1. Daily Manager: Today's Plan, protocol tasks, notifications, route navigation, setup readiness, and what to do next.\n2. Messaging Operator: fan lookup, DM thread scans, reply drafts, composer fills, and fan focus. Drafting is safe; sending still needs app confirmation.\n3. Content Operator: captions, calendar, vault, photo/video prep, and publish preparation. Publishing still needs app confirmation.\n4. Protection Operator: leak alerts, reputation mentions, DMCA drafts, scans, and triage. Filing or externally visible enforcement still needs confirmation.\nUse these profiles as handoff-style mental routing: pick the smallest profile that matches the request, batch safe reads when helpful, and keep the creator oriented with the personality's narration setting.`
}

export function buildDivineRealtimeAgentInstructions(
  baseInstructions: string,
  personality: ResolvedVoicePersonality,
): string {
  const narration = normalizeToolNarration(personality.tool_narration)
  const reasoning = realtimeReasoningEffortForPersonality(personality)
  return `${baseInstructions}\n\nRealtime 2 staged agent harness is active.\nReasoning effort for this session: ${reasoning}.\nTool narration mode: ${narration}.${capabilityProfilesBlock()}${appActionRegistryBlock()}`
}

export type BuildDivineRealtimeSessionConfigInput = {
  model: string
  instructions: string
  voice: string
  tools: unknown[]
  personality: ResolvedVoicePersonality
  traceGroupId?: string
  traceMetadata?: Record<string, unknown>
}

export function buildDivineRealtimeSessionConfig({
  model,
  instructions,
  voice,
  tools,
  personality,
  traceGroupId,
  traceMetadata,
}: BuildDivineRealtimeSessionConfigInput): Record<string, unknown> {
  const config: Record<string, unknown> = {
    type: 'realtime',
    model,
    instructions: buildDivineRealtimeAgentInstructions(instructions, personality),
    output_modalities: ['audio'],
    audio: { output: { voice } },
    tools,
    tool_choice: 'auto',
    parallel_tool_calls: true,
    turn_detection: realtimeTurnDetectionForPersonality(personality),
    tracing: {
      workflow_name: 'Divine Manager Realtime Voice',
      group_id: traceGroupId,
      metadata: {
        surface: 'divine_manager',
        model,
        personality_preset: personality.preset_id ?? 'balanced_partner',
        ...traceMetadata,
      },
    },
  }

  if (model.includes('gpt-realtime-2')) {
    config.reasoning = { effort: realtimeReasoningEffortForPersonality(personality) }
  }

  return config
}

const TOOL_LABELS: Record<string, string> = {
  get_stats: 'checking stats',
  list_fans: 'checking fans',
  get_dm_conversations: 'checking inbox',
  get_dm_thread: 'reading the thread',
  get_reply_suggestions: 'drafting replies',
  get_dm_thread_and_suggestions: 'reading and drafting',
  list_content: 'checking content',
  get_scheduled_content_summary: 'checking the calendar',
  list_cosmic_calendar: 'checking timing',
  list_leak_alerts: 'checking protection',
  list_reputation_mentions: 'checking mentions',
  run_leak_scan: 'running a leak scan',
  run_reputation_scan: 'running a reputation scan',
  ui_navigate: 'opening that view',
  ui_focus_fan: 'opening that fan',
  draft_fan_reply: 'drafting a reply',
  run_ai_studio_tool: 'running the studio tool',
  add_protocol_task: 'adding a task',
  mark_protocol_task_done: 'updating tasks',
  mass_dm: 'preparing a confirmation',
  send_message: 'preparing a confirmation',
  adjust_price: 'preparing a confirmation',
  pricing_changes: 'preparing a confirmation',
  content_publish: 'preparing a confirmation',
  publish_queue_item: 'preparing a confirmation',
}

export function realtimeWorkingLabel(toolNames: readonly string[]): string | null {
  const names = [...new Set(toolNames.filter(Boolean))]
  if (names.length === 0) return null
  if (names.length > 1) return `Working on ${names.length} safe steps...`
  return `Working on ${TOOL_LABELS[names[0]] ?? 'that'}...`
}
