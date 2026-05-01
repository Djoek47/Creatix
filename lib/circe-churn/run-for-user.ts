import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { canUseCreditGatedProFeature } from '@/lib/billing/access'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'
import {
  extractChurnFanSignalsFromDigest,
  normalizeRiskLevel,
} from '@/lib/circe-churn/parse-digest-json'
import { formatCalendarTeaserNotesForPrompt } from '@/lib/circe-churn/calendar-teaser-notes-format'

export type CirceChurnSettingsRow = {
  user_id: string
  enabled: boolean
  run_cadence: 'off' | 'daily' | 'weekly'
  run_hour_utc: number
  expiring_within_days: number
  stale_interaction_days: number
  include_stale_active: boolean
  max_fans_per_run: number
  notify_on_run_summary: boolean
  notify_when_empty: boolean
  credits_per_run: number
  link_divine_manager_tasks?: boolean
  link_protocol_tasks?: boolean
  /** When true (default), digest includes future-drop / calendar teaser lines for at-risk fans. */
  tease_future_content?: boolean
  /** Optional creator notes: upcoming themes, days, or drops for teaser ideas. */
  calendar_teaser_notes?: string | null
  last_run_at: string | null
  last_run_error: string | null
  last_digest_excerpt: string | null
  last_digest_markdown?: string | null
  last_digest_at?: string | null
}

export function defaultCirceChurnSettings(userId: string): CirceChurnSettingsRow {
  return {
    user_id: userId,
    enabled: false,
    run_cadence: 'off',
    run_hour_utc: 9,
    expiring_within_days: 14,
    stale_interaction_days: 10,
    include_stale_active: true,
    max_fans_per_run: 6,
    notify_on_run_summary: true,
    notify_when_empty: false,
    credits_per_run: 2,
    link_divine_manager_tasks: true,
    link_protocol_tasks: true,
    tease_future_content: true,
    calendar_teaser_notes: null,
    last_run_at: null,
    last_run_error: null,
    last_digest_excerpt: null,
    last_digest_markdown: null,
    last_digest_at: null,
  }
}

function churnDigestSystemPrompt(settings: CirceChurnSettingsRow): string {
  const teaseOn = settings.tease_future_content !== false
  const teaseBlock = teaseOn
    ? `

Also under each fan section (after Draft DM), add:
- **Future content teaser**: 2–3 short lines for feed, story, or DM — something worth staying subscribed for is coming, without inventing specifics the creator did not provide.
- **Calendar teaser**: If the batch prompt includes the creator's schedule notes, align teasers to those days/themes; otherwise suggest a tasteful "this week / weekend" rhythm without fake dates.

Stay platform-appropriate; no harassment or pressure tactics.`
    : ''

  return `You are Circe's Churn Predictor (background job). You receive several at-risk subscribers at once.

Output markdown with:
## Summary
2–4 sentences on overall churn themes for this batch.

Then for EACH fan (use @username headings):
- **Risk**: Low / Medium / High / Critical + one-line why (expiry, silence, spend cooling, renew off…)
- **Likely reasons**: bullets (inference, not accusation)
- **Free or unlock ideas**: 2 concrete ideas — e.g. which type of past PPV/set to gift, teaser clip, loyalty perk, time-limited unlock — platform-safe, no harassment
- **Next actions**: 2–3 bullets (DM angle, post, mass-DM segment — be specific)
- **Draft DM**: one short warm message they can edit${teaseBlock}

After the markdown, output ONE fenced JSON block exactly in this shape (use real fan UUIDs from the "### Fan id …" headers above):
\`\`\`json
{ "fans": [ { "fanId": "<uuid>", "risk": "High", "one_line": "short reason for inbox" } ] }
\`\`\`
Include every fan in the batch. Risk must be one of: Low, Medium, High, Critical.`
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function isChurnDueForRun(settings: CirceChurnSettingsRow, now: Date = new Date()): boolean {
  if (!settings.enabled || settings.run_cadence === 'off') return false
  if (now.getUTCHours() !== settings.run_hour_utc) return false

  const last = settings.last_run_at ? new Date(settings.last_run_at) : null
  if (last) {
    const sameUtcHourToday =
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate() &&
      last.getUTCHours() === now.getUTCHours()
    if (sameUtcHourToday) return false
  }

  if (settings.run_cadence === 'daily') {
    if (last && utcYmd(last) >= utcYmd(now)) return false
  }

  if (settings.run_cadence === 'weekly') {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    if (last && now.getTime() - last.getTime() < weekMs) return false
  }

  return true
}

type FanRow = {
  id: string
  platform: string
  platform_fan_id: string | null
  username: string
  display_name: string | null
  total_spent: number | null
  subscription_status: string | null
  subscription_tier: string | null
  last_interaction_at: string | null
  first_subscribed_at: string | null
  notes: string | null
  subscription_expires_at: string | null
  subscription_renews_on: string | null
  is_renewing: boolean | null
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
}

export function pickChurnCandidates(
  rows: FanRow[],
  opts: {
    expiringWithinDays: number
    staleInteractionDays: number
    includeStaleActive: boolean
    maxFans: number
  },
): FanRow[] {
  const now = new Date()
  const out: { fan: FanRow; score: number; reason: string }[] = []

  for (const fan of rows) {
    if ((fan.subscription_status || '').toLowerCase() !== 'active') continue

    let score = 0
    const reasons: string[] = []

    const exp = fan.subscription_expires_at ? new Date(fan.subscription_expires_at) : null
    if (exp && !Number.isNaN(exp.getTime())) {
      const daysLeft = daysBetween(now, exp)
      if (daysLeft >= 0 && daysLeft <= opts.expiringWithinDays) {
        score = Math.max(score, 200 - Math.min(daysLeft, 30))
        reasons.push(`subscription ends in ~${daysLeft}d`)
      }
    }

    const last = fan.last_interaction_at ? new Date(fan.last_interaction_at) : null
    if (last && !Number.isNaN(last.getTime()) && opts.includeStaleActive) {
      const staleDays = daysBetween(last, now)
      if (staleDays >= opts.staleInteractionDays) {
        score = Math.max(score, 80 + Math.min(staleDays, 40))
        reasons.push(`no chat ~${staleDays}d`)
      }
    }

    if (fan.is_renewing === false && exp && !Number.isNaN(exp.getTime())) {
      const daysLeft = daysBetween(now, exp)
      if (daysLeft >= 0 && daysLeft <= opts.expiringWithinDays) {
        score += 40
        reasons.push('auto-renew off')
      }
    }

    if (score > 0) {
      out.push({ fan, score, reason: reasons.join('; ') })
    }
  }

  out.sort((a, b) => b.score - a.score)
  return out.slice(0, opts.maxFans).map((x) => x.fan)
}

export type RunCirceChurnForUserResult = {
  ran: boolean
  skippedReason?: string
  candidates?: number
  creditsCharged?: number
  error?: string
}

export async function runCirceChurnForUser(
  supabase: SupabaseClient,
  settings: CirceChurnSettingsRow,
  options?: { dryRun?: boolean; now?: Date; force?: boolean; overrideMaxFans?: number },
): Promise<RunCirceChurnForUserResult> {
  const now = options?.now ?? new Date()
  const dryRun = options?.dryRun === true || process.env.CHURN_DRY_RUN === 'true'
  const force = options?.force === true

  if (!force && !isChurnDueForRun(settings, now)) {
    return { ran: false, skippedReason: 'not_due' }
  }

  const userId = settings.user_id

  const { data: sub } = await supabase
    .from('subscriptions')
    .select(
      'plan_id, status, ai_credits_used, ai_credits_limit, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (!canUseCreditGatedProFeature(sub as { plan_id?: string | null; status?: string | null } | null)) {
    return { ran: false, skippedReason: 'not_entitled' }
  }

  const creditsNeeded = Math.min(10, Math.max(1, Math.round(Number(settings.credits_per_run ?? 2))))
  const creditCheck = await hasEnoughAiCredits(supabase, userId, creditsNeeded)
  if (!creditCheck.ok) {
    const ts = now.toISOString()
    await supabase
      .from('circe_churn_settings')
      .update({ last_run_at: ts, last_run_error: 'Insufficient AI credits', updated_at: ts })
      .eq('user_id', userId)
    return { ran: false, skippedReason: 'no_credits' }
  }

  const maxFansEffective = Math.min(
    25,
    Math.max(
      1,
      typeof options?.overrideMaxFans === 'number'
        ? Math.round(options.overrideMaxFans)
        : Math.round(Number(settings.max_fans_per_run) || 6),
    ),
  )

  const fanSelect =
    'id, platform, platform_fan_id, username, display_name, total_spent, subscription_status, subscription_tier, last_interaction_at, first_subscribed_at, notes, subscription_expires_at, subscription_renews_on, is_renewing'

  const [onlyfansRes, fanslyRes] = await Promise.all([
    supabase.from('fans').select(fanSelect).eq('user_id', userId).eq('platform', 'onlyfans').limit(2500),
    supabase.from('fans').select(fanSelect).eq('user_id', userId).eq('platform', 'fansly').limit(2500),
  ])

  const fanErr = onlyfansRes.error ?? fanslyRes.error
  const fanRows = [...(onlyfansRes.data || []), ...(fanslyRes.data || [])]

  if (fanErr) {
    return { ran: false, skippedReason: 'fan_query', error: fanErr.message }
  }

  const candidates = pickChurnCandidates((fanRows || []) as FanRow[], {
    expiringWithinDays: settings.expiring_within_days,
    staleInteractionDays: settings.stale_interaction_days,
    includeStaleActive: settings.include_stale_active,
    maxFans: maxFansEffective,
  })

  const ts = now.toISOString()

  if (candidates.length === 0) {
    await supabase
      .from('circe_churn_settings')
      .update({
        last_run_at: ts,
        last_run_error: null,
        updated_at: ts,
      })
      .eq('user_id', userId)

    if (settings.notify_when_empty && settings.notify_on_run_summary) {
      await insertDivineAppNotification(supabase, userId, {
        type: 'system',
        title: 'Churn Predictor: no at-risk fans',
        description: 'No subscribers matched expiring or low-engagement rules this run. CRM sync helps accuracy.',
        link: '/dashboard/retention/churn',
        metadata: { kind: 'churn_background', empty: true },
      })
    }
    return { ran: true, candidates: 0 }
  }

  if (dryRun) {
    return { ran: true, candidates: candidates.length, skippedReason: 'dry_run' }
  }

  const blocks: string[] = []
  for (const fan of candidates) {
    const pfid = fan.platform_fan_id?.trim() || ''
    let threadExcerpt = ''
    let profileHint = ''
    if (pfid) {
      const { data: insight } = await supabase
        .from('fan_thread_insights')
        .select('thread_snapshot_text, summary_excerpt, profile_json')
        .eq('user_id', userId)
        .eq('platform', fan.platform)
        .eq('platform_fan_id', pfid)
        .maybeSingle()
      const ins = insight as Record<string, unknown> | null
      if (ins?.thread_snapshot_text && typeof ins.thread_snapshot_text === 'string') {
        threadExcerpt = ins.thread_snapshot_text.slice(0, 3500)
      }
      if (ins?.summary_excerpt && typeof ins.summary_excerpt === 'string') {
        threadExcerpt = [threadExcerpt, `Summary: ${ins.summary_excerpt}`].filter(Boolean).join('\n\n').slice(0, 4000)
      }
      if (ins?.profile_json != null) {
        try {
          profileHint = JSON.stringify(ins.profile_json).slice(0, 2500)
        } catch {
          profileHint = ''
        }
      }
    }

    const spent = Number(fan.total_spent ?? 0)
    const exp = fan.subscription_expires_at ? String(fan.subscription_expires_at) : ''
    blocks.push(
      [
        `### Fan id ${fan.id} (@${fan.username})`,
        `Platform: ${fan.platform} · spend: ${spent} · tier: ${fan.subscription_tier || '—'}`,
        exp ? `Period end (CRM): ${exp}` : '',
        fan.is_renewing === false ? 'Auto-renew: off' : '',
        fan.notes ? `Notes: ${String(fan.notes).slice(0, 400)}` : '',
        threadExcerpt ? `Thread:\n${threadExcerpt}` : '(No thread snapshot — refresh scan in Messages if needed.)',
        profileHint ? `Profile JSON:\n${profileHint}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  const calendarBlock =
    settings.tease_future_content !== false
      ? `

Creator upcoming content / calendar notes (optional — use only for teaser ideas; if empty, suggest generic angles):
${formatCalendarTeaserNotesForPrompt(settings.calendar_teaser_notes)}`
      : ''

  let digest = ''
  try {
    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      system: `${churnDigestSystemPrompt(settings)}

Stay practical, adult-platform appropriate, no illegal or coercive tactics.`,
      prompt: `Analyze this batch of CRM fans for retention.

${blocks.join('\n\n---\n\n')}${calendarBlock}`,
    })
    digest = text
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI failed'
    await supabase
      .from('circe_churn_settings')
      .update({ last_run_at: ts, last_run_error: msg, updated_at: ts })
      .eq('user_id', userId)
    return { ran: true, candidates: candidates.length, error: msg }
  }

  const excerpt = digest.slice(0, 500)

  const consumed = await consumeAiCredits(supabase, userId, creditsNeeded, {
    reasonCode: 'retention_churn_digest',
    metadata: { service_display_name: 'Retention digest (Churn)' },
  })
  if (!consumed.ok) {
    const tsErr = now.toISOString()
    await supabase
      .from('circe_churn_settings')
      .update({ last_run_at: tsErr, last_run_error: 'Insufficient AI credits', updated_at: tsErr })
      .eq('user_id', userId)
    return { ran: true, candidates: candidates.length, error: 'Insufficient AI credits' }
  }

  await supabase
    .from('circe_churn_settings')
    .update({
      last_run_at: ts,
      last_run_error: null,
      last_digest_excerpt: excerpt,
      last_digest_markdown: digest.slice(0, 24000),
      last_digest_at: ts,
      updated_at: ts,
    })
    .eq('user_id', userId)

  const allowedIds = new Set(candidates.map((c) => c.id))
  const signals = extractChurnFanSignalsFromDigest(digest)
  for (const sig of signals) {
    if (!allowedIds.has(sig.fanId)) continue
    const fan = candidates.find((c) => c.id === sig.fanId)
    const pfid = fan?.platform_fan_id?.trim()
    if (!fan || !pfid) continue
    const plat = fan.platform === 'fansly' ? 'fansly' : 'onlyfans'
    await supabase.from('fan_churn_snapshots').upsert(
      {
        user_id: userId,
        fan_id: fan.id,
        platform: plat,
        platform_fan_id: pfid,
        risk_level: normalizeRiskLevel(sig.risk),
        one_line: sig.one_line.slice(0, 500),
        updated_at: ts,
      },
      { onConflict: 'user_id,fan_id' },
    )
  }

  const linkMgr = settings.link_divine_manager_tasks !== false
  const linkProto = settings.link_protocol_tasks !== false
  if (candidates.length > 0 && linkMgr) {
    await supabase.from('divine_manager_tasks').insert({
      user_id: userId,
      type: 'churn_retention_digest',
      category: 'retention',
      status: 'suggested',
      payload: {
        summary: `Churn digest: ${candidates.length} at-risk fan${candidates.length === 1 ? '' : 's'}`,
        excerpt: excerpt.slice(0, 400),
        link: '/dashboard/retention/churn',
        fan_ids: candidates.map((c) => c.id),
      },
      source: 'circe_churn',
    })
  }
  if (candidates.length > 0 && linkProto) {
    const planDate = new Date().toISOString().slice(0, 10)
    await supabase.from('creator_protocol_tasks').insert({
      user_id: userId,
      title: `Retention: ${candidates.length} fan${candidates.length === 1 ? '' : 's'} flagged by Churn Predictor`,
      body: excerpt.slice(0, 2000),
      status: 'pending',
      source: 'divine',
      metadata: { kind: 'churn_batch', fan_count: candidates.length },
      plan_date: planDate,
      priority_tier: 2,
      sort_order: 0,
    })
  }

  if (settings.notify_on_run_summary) {
    const first = candidates[0]
    await insertDivineAppNotification(supabase, userId, {
      type: 'fan',
      title: `Churn Predictor: ${candidates.length} subscriber${candidates.length === 1 ? '' : 's'} need attention`,
      description: excerpt ? `${excerpt}${digest.length > 500 ? '…' : ''}` : digest.slice(0, 400),
      link: '/dashboard/retention/churn',
      platform: first.platform === 'fansly' ? 'fansly' : 'onlyfans',
      platform_fan_id: first.platform_fan_id,
      metadata: {
        kind: 'churn_background',
        fan_count: candidates.length,
        credits_charged: creditsNeeded,
      },
    })
  }

  return { ran: true, candidates: candidates.length, creditsCharged: creditsNeeded }
}
