import { generateTextWithOpenAI } from '@/lib/divine-openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSettings,
  getTasks,
  createTask,
  updateTask,
  type DivineBackgroundOps,
  type DivineManagerSettingsRow,
  type DivineManagerTaskRow,
} from '@/lib/divine-manager'
import { getArchetypeFlavor } from '@/lib/divine-manager-archetypes'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'

export type DivineDigestSnapshot = {
  notifications_unread: number
  divine_notifications_unread: number
  open_leak_alerts: number
  scheduled_posts_count: number
  protocol_open_tasks: number
  suggested_manager_tasks: number
}

async function gatherDigestSnapshot(
  supabase: SupabaseClient,
  userId: string,
  includeLeaks: boolean,
): Promise<DivineDigestSnapshot> {
  const leakQ = includeLeaks
    ? supabase.from('leak_alerts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'detected')
    : Promise.resolve({ count: 0 } as { count: number | null })

  const [
    notifUnread,
    divineUnread,
    leaks,
    scheduledContent,
    protocolOpen,
    suggestedTasks,
  ] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .eq('origin', 'divine_app'),
    leakQ,
    supabase.from('content').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'scheduled'),
    supabase
      .from('creator_protocol_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'executing']),
    supabase
      .from('divine_manager_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['suggested', 'scheduled']),
  ])

  return {
    notifications_unread: notifUnread.count ?? 0,
    divine_notifications_unread: divineUnread.count ?? 0,
    open_leak_alerts: includeLeaks ? leaks.count ?? 0 : 0,
    scheduled_posts_count: scheduledContent.count ?? 0,
    protocol_open_tasks: protocolOpen.count ?? 0,
    suggested_manager_tasks: suggestedTasks.count ?? 0,
  }
}

function digestIntervalDue(bg: DivineBackgroundOps): boolean {
  const minH = Math.max(1, Number(bg.min_interval_hours) || 4)
  const last = bg.last_digest_at ? Date.parse(bg.last_digest_at) : 0
  if (!last || Number.isNaN(last)) return true
  return Date.now() - last >= minH * 3600_000
}

async function patchBackgroundOpsLastDigest(
  supabase: SupabaseClient,
  userId: string,
  settings: DivineManagerSettingsRow,
  bg: DivineBackgroundOps,
): Promise<void> {
  const rules = { ...(settings.automation_rules ?? {}) }
  const next: DivineBackgroundOps = {
    ...bg,
    last_digest_at: new Date().toISOString(),
  }
  rules.divine_background_ops = next
  const { error } = await supabase
    .from('divine_manager_settings')
    .update({ automation_rules: rules, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) console.warn('[patchBackgroundOpsLastDigest]', error.message)
}

function formatDigestDescription(snap: DivineDigestSnapshot, summary?: string | null): string {
  if (summary && summary.trim()) return summary.trim().slice(0, 1900)
  const parts = [
    `${snap.notifications_unread} unread in-app notifications`,
    `${snap.divine_notifications_unread} unread Divine notifications`,
    `${snap.scheduled_posts_count} scheduled posts`,
    `${snap.protocol_open_tasks} open protocol tasks`,
    `${snap.suggested_manager_tasks} manager suggestions in queue`,
  ]
  if (snap.open_leak_alerts > 0) parts.push(`${snap.open_leak_alerts} open leak alerts (check Protection)`)
  return `Divine brief: ${parts.join(' · ')}. Open Divine Manager for Today’s Plan.`
}

/** Build system prompt for the Divine Manager brain. Preference hints from past approve/skip behavior. */
function buildSystemPrompt(settings: DivineManagerSettingsRow, preferenceHint: string, withDigest: boolean): string {
  const persona = settings.persona ?? {}
  const goals = settings.goals ?? {}
  const rules = settings.automation_rules ?? {}
  const archetypeFlavor = getArchetypeFlavor(settings.manager_archetype)
  const notify = settings.notification_settings ?? {}
  return `You are the Divine Manager (Big Pimping) for a creator. You coordinate posts, DMs, pricing, and growth using Circe & Venus tools. You never role-play as the creator; you always speak as their manager.

Creator persona: tone ${persona.tone ?? 'friendly'}, flirty level ${persona.flirtyLevel ?? 'mild'}. Boundaries: ${(persona.boundaries ?? []).join('; ') || 'none specified'}.
Goals: ${(goals.qualitativeGoals ?? []).join(', ') || 'general growth'}.
Automation allowed: auto-post ${rules.autoPostSchedule?.enabled ? 'yes' : 'no'}, welcome DM ${rules.autoWelcomeDm?.enabled ? 'yes' : 'no'}, tip follow-up ${rules.autoFollowUpAfterTips?.enabled ? 'yes' : 'no'}.
Notification preference: level=${notify.level ?? 'daily_digest'}, channel=${notify.channel ?? 'in_app'}.
Archetype mode: ${settings.manager_archetype || 'hermes'}. ${archetypeFlavor}
${preferenceHint ? `Preference learning (prioritize types they often approve, avoid types they often dismiss): ${preferenceHint}` : ''}

The creator's connected platforms are OnlyFans and Fansly; use "onlyfans" or "fansly" for the platform field when relevant.

Given recent tasks and context, suggest 1-5 concrete next tasks. Types: post_suggestion, dm_welcome, dm_followup, pricing_change, content_idea, churn_review, engagement_reminder.
Return ONLY JSON with a "tasks" array. Each task MUST have:
- "type": one of the types above
- "category": "dm" | "content" | "pricing" | "analytics"
- "summary": short human-readable description
- "suggestedText": optional DM or caption text, if applicable
- "platform": "onlyfans" | "fansly" | null
- "segment": optional short label like "dormant_high_spend" or "new_subs"
- "source": e.g. "churn_predictor", "content_ideas", "manager".
${
  withDigest
    ? `
When a "Creator snapshot" block appears in the user message, also include top-level "digest_summary": string (max 220 chars) — one friendly line for the creator's in-app inbox.`
    : ''
}`
}

/**
 * Run the Divine Manager brain for a user: load settings and recent tasks, call AI to suggest tasks, create them in DB.
 * Use with user-scoped supabase (POST from app) or service-role supabase (cron) for the given userId.
 */
export async function runDivineManagerBrain(
  supabase: SupabaseClient,
  userId: string
): Promise<DivineManagerTaskRow[]> {
  const settings = await getSettings(supabase, userId)
  if (!settings || settings.mode === 'off') return []

  const bg = (settings.automation_rules?.divine_background_ops ?? {}) as DivineBackgroundOps
  const backgroundEnabled = bg.enabled === true
  const digestDue = backgroundEnabled && digestIntervalDue(bg)
  const includeLeaks = bg.include_leaks !== false
  let snapshot: DivineDigestSnapshot | null = null
  if (digestDue) {
    snapshot = await gatherDigestSnapshot(supabase, userId, includeLeaks)
  }

  const recentTasks = await getTasks(supabase, userId, { limit: 15 })
  const recentSummary = recentTasks
    .slice(0, 10)
    .map((t) => `[${t.status}] ${t.type}: ${JSON.stringify(t.payload).slice(0, 80)}...`)
    .join('\n')

  // Preference learning: from all tasks, count approved (executed) vs dismissed (skipped) by type
  const allTasks = await getTasks(supabase, userId, { limit: 100 })
  const byType: Record<string, { approved: number; dismissed: number }> = {}
  for (const t of allTasks) {
    if (t.status !== 'executed' && t.status !== 'skipped') continue
    if (!byType[t.type]) byType[t.type] = { approved: 0, dismissed: 0 }
    if (t.status === 'executed') byType[t.type].approved += 1
    else byType[t.type].dismissed += 1
  }
  const preferenceHint = Object.entries(byType)
    .filter(([, v]) => v.approved > 0 || v.dismissed > 0)
    .map(([type, v]) => `${type}: ${v.approved} approved, ${v.dismissed} dismissed`)
    .join('; ') || ''

  const suggestTasks = bg.suggest_tasks !== false
  const wantDigestNotif = bg.digest_notifications === true

  if (digestDue && snapshot && !suggestTasks && wantDigestNotif) {
    await insertDivineAppNotification(supabase, userId, {
      type: 'system',
      title: 'Divine — daily brief',
      description: formatDigestDescription(snapshot, null),
      link: '/dashboard/divine-manager',
    })
    await patchBackgroundOpsLastDigest(supabase, userId, settings, bg)
    return []
  }

  if (digestDue && snapshot && !suggestTasks && !wantDigestNotif) {
    await patchBackgroundOpsLastDigest(supabase, userId, settings, bg)
    return []
  }

  const systemPrompt = buildSystemPrompt(settings, preferenceHint, Boolean(snapshot))
  let userPrompt = `Recent tasks:\n${recentSummary || 'None yet.'}\n\nSuggest the next 1-5 tasks as JSON as described in the system prompt.`
  if (snapshot) {
    userPrompt += `\n\nCreator snapshot (use for targeted suggestions):\n${JSON.stringify(snapshot)}`
  }

  const { text } = await generateTextWithOpenAI({
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 1500,
  })

  const created: DivineManagerTaskRow[] = []
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return created
    let json: Record<string, unknown>
    try {
      json = JSON.parse(match[0]) as Record<string, unknown>
    } catch {
      return created
    }
    const digestSummary = typeof json.digest_summary === 'string' ? json.digest_summary : null
    const tasks = json.tasks

    if (digestDue && snapshot) {
      if (wantDigestNotif) {
        await insertDivineAppNotification(supabase, userId, {
          type: 'system',
          title: 'Divine — daily brief',
          description: formatDigestDescription(snapshot, digestSummary),
          link: '/dashboard/divine-manager',
        })
      }
      await patchBackgroundOpsLastDigest(supabase, userId, settings, bg)
    }

    if (!suggestTasks || !Array.isArray(tasks) || tasks.length === 0) return created

    const rules = settings.automation_rules ?? {}
    const isSemiAuto = settings.mode === 'semi_auto'
    const ruleEnabled = (type: string) => {
      if (type === 'dm_welcome') return rules.autoWelcomeDm?.enabled
      if (type === 'dm_followup') return rules.autoFollowUpAfterTips?.enabled
      if (type === 'post_suggestion') return rules.autoPostSchedule?.enabled
      return false
    }

    for (const t of tasks.slice(0, 5)) {
      const type = typeof t.type === 'string' ? t.type : 'content_idea'
      const summary = typeof t.summary === 'string' ? t.summary : ''
      const category = typeof t.category === 'string' ? t.category : null
      const payload: Record<string, unknown> = { summary }
      if (typeof t.suggestedText === 'string') payload.suggestedText = t.suggestedText
      if (typeof t.segment === 'string') payload.segment = t.segment
      if (typeof t.platform === 'string') payload.platform = t.platform
      const status = isSemiAuto && ruleEnabled(type) ? 'scheduled' : 'suggested'
      const row = await createTask(supabase, {
        user_id: userId,
        type,
        category,
        status,
        payload,
        source: typeof t.source === 'string' ? t.source : 'manager',
      })
      created.push(row)
    }
  } catch {
    // If JSON parse or insert fails, still return what we have
  }
  return created
}

/**
 * Execute scheduled tasks for a user (semi_auto). For now, marks them executed as a placeholder.
 * Real execution (e.g. send welcome DM via platform API) can be wired when fan lists and APIs are ready.
 */
export async function executeScheduledTasksForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ executed: number; failed: number }> {
  const { data: scheduled } = await supabase
    .from('divine_manager_tasks')
    .select('id, type, category, payload')
    .eq('user_id', userId)
    .eq('status', 'scheduled')

  let executed = 0
  let failed = 0

  for (const t of scheduled ?? []) {
    try {
      const type = t.type as string
      const category = (t.category as string | null) ?? null

      // NOTE: Placeholder execution — replace with real platform calls when wiring APIs.
      let executorNote = 'Auto-executed placeholder'
      if (type === 'vault_resale_campaign') {
        executorNote =
          'Vault resale: confirm media IDs, price, and schedule in Content; never auto-send without review.'
      } else if (type === 'mass_dm_batch') {
        executorNote =
          'Mass DM batch: confirm segment, copy, and rate limits in Messages before sending.'
      } else if (type === 'scheduled_post') {
        executorNote = 'Scheduled post: verify time and platforms in Content calendar.'
      } else if (type === 'dm_welcome' || type === 'dm_followup') {
        executorNote = 'DM auto-executed placeholder'
      } else if (category === 'content') {
        executorNote = 'Content scheduling placeholder'
      } else if (category === 'pricing') {
        executorNote = 'Pricing adjustment placeholder'
      }

      await updateTask(supabase, t.id, {
        status: 'executed',
        executed_at: new Date().toISOString(),
        payload: {
          ...(t.payload ?? {}),
          executorNote,
        } as Record<string, unknown>,
      })
      executed += 1
    } catch {
      await updateTask(supabase, t.id, { status: 'failed' }).catch(() => {})
      failed += 1
    }
  }
  return { executed, failed }
}
