import type { SupabaseClient } from '@supabase/supabase-js'
import type { DivineManagerGoals } from '@/lib/divine-manager'

export type MimicProfile = {
  tabooTopics?: string[]
  bannedPhrases?: string[]
  escalateOnKeywords?: string[]
}

type ConversationRow = {
  last_message_preview?: string | null
  unread_count?: number | null
  last_message_at?: string | null
}

/** Same semantics as client-side wellbeing score: unread + tense previews + boundary lexicon. */
export function scoreMessagePressureFromDbRows(
  conversations: ConversationRow[],
  mimic: MimicProfile | null,
): number {
  const unread = conversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)
  const texts = conversations
    .map((c) => String(c.last_message_preview || '').toLowerCase())
    .filter(Boolean)
  const stressWords = ['urgent', 'now', 'angry', 'refund', 'scam', 'wtf']
  const stressHits = texts.reduce((s, t) => s + (stressWords.some((w) => t.includes(w)) ? 1 : 0), 0)
  const boundaryWords = [
    ...(mimic?.tabooTopics ?? []),
    ...(mimic?.bannedPhrases ?? []),
    ...(mimic?.escalateOnKeywords ?? []),
  ]
    .map((s) => String(s || '').toLowerCase().trim())
    .filter(Boolean)
  const boundaryHits = texts.reduce(
    (s, t) => s + (boundaryWords.some((w) => w.length > 2 && t.includes(w)) ? 1 : 0),
    0,
  )
  return Math.min(100, unread * 4 + stressHits * 10 + boundaryHits * 12)
}

export type FlowActivitySignals = {
  messagePressure: number
  inboxUnreadTotal: number
  activeThreads24h: number
  protocolOpen: number
  managerSuggested: number
  managerScheduled: number
  goals: DivineManagerGoals | null
  goalsText: string
}

async function countManagerByStatus(
  supabase: SupabaseClient,
  userId: string,
  status: 'suggested' | 'scheduled',
): Promise<number> {
  const { count } = await supabase
    .from('divine_manager_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', status)
  return count ?? 0
}

function formatGoalsForPrompt(goals: DivineManagerGoals | null): string {
  if (!goals) return 'No structured goals saved in Divine Manager yet.'
  const parts: string[] = []
  if (Array.isArray(goals.qualitativeGoals) && goals.qualitativeGoals.length) {
    parts.push(`Qualitative: ${goals.qualitativeGoals.join('; ')}`)
  }
  if (typeof goals.targetSubscribers === 'number') {
    parts.push(`Target subscribers: ${goals.targetSubscribers}`)
  }
  if (typeof goals.targetRetention === 'number') {
    parts.push(`Target retention (%): ${goals.targetRetention}`)
  }
  if (typeof goals.targetARPU === 'number') {
    parts.push(`Target ARPU: ${goals.targetARPU}`)
  }
  return parts.length ? parts.join('. ') : 'Goals object exists but fields are empty.'
}

export async function gatherFlowActivitySignals(
  supabase: SupabaseClient,
  userId: string,
): Promise<FlowActivitySignals> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [convRes, settingsRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('last_message_preview, unread_count, last_message_at')
      .eq('user_id', userId),
    supabase.from('divine_manager_settings').select('goals, mimic_profile').eq('user_id', userId).maybeSingle(),
  ])

  const [protoRes, suggestedCount, scheduledCount] = await Promise.all([
    supabase
      .from('creator_protocol_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'executing']),
    countManagerByStatus(supabase, userId, 'suggested'),
    countManagerByStatus(supabase, userId, 'scheduled'),
  ])

  const conversations = (convRes.data ?? []) as ConversationRow[]
  const settings = settingsRes.data as
    | { goals?: DivineManagerGoals | null; mimic_profile?: unknown }
    | null
    | undefined
  const mimic = (settings?.mimic_profile ?? null) as MimicProfile | null
  const goals = settings?.goals ?? null

  const inboxUnreadTotal = conversations.reduce((s, c) => s + Number(c.unread_count || 0), 0)
  const activeThreads24h = conversations.filter(
    (c) => c.last_message_at && c.last_message_at >= dayAgo,
  ).length
  const messagePressure = scoreMessagePressureFromDbRows(conversations, mimic)

  return {
    messagePressure,
    inboxUnreadTotal,
    activeThreads24h,
    protocolOpen: protoRes.count ?? 0,
    managerSuggested: suggestedCount,
    managerScheduled: scheduledCount,
    goals,
    goalsText: formatGoalsForPrompt(goals),
  }
}
