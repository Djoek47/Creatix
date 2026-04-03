import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { analyzePostCommentWithAi } from '@/lib/commenter/analyze-comment'
import { mergeCommentDeltaIntoFanProfile } from '@/lib/commenter/merge-profile-delta'
import {
  policySkipExpensiveAiForCreatorLikely,
  shouldSkipExpensiveAiForContact,
} from '@/lib/divine/creator-resource-policy'
import { formatFanCommerceContextForAi, type SubscriptionAccountType } from '@/lib/fans/subscription-account-type'
import { formatCommentPostAccessForAi } from '@/lib/onlyfans/comment-post-access'
import { parseFanAccessTier } from '@/lib/fans/fan-access-tier'

type LooseSb = SupabaseClient<any, 'public', any, any>

function threadExcerptFromProfileJson(profileJson: unknown): string | null {
  if (!profileJson || typeof profileJson !== 'object') return null
  const p = profileJson as Record<string, unknown>
  const parts: string[] = []
  for (const k of ['preferences', 'interests', 'tone', 'relationship_notes', 'signals_from_comments']) {
    const v = p[k]
    if (v != null) parts.push(`${k}: ${JSON.stringify(v).slice(0, 1200)}`)
  }
  const s = parts.join('\n').trim()
  return s.length ? s.slice(0, 6000) : null
}

function parseSalesIntensity(rules: unknown): 'standard' | 'bold' {
  if (!rules || typeof rules !== 'object') return 'standard'
  const r = rules as Record<string, unknown>
  const c = r.commenter
  if (c && typeof c === 'object' && (c as { sales_intensity?: string }).sales_intensity === 'bold') {
    return 'bold'
  }
  return 'standard'
}

/**
 * Run AI analysis, store suggestions, merge CRM signals, optional safety notification.
 */
export async function processPlatformPostCommentById(
  supabase: LooseSb,
  commentId: string,
  opts?: { bypassCreatorResourceSkip?: boolean },
): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const { data: row, error: fetchErr } = await supabase
    .from('platform_post_comments')
    .select('*')
    .eq('id', commentId)
    .maybeSingle()

  if (fetchErr) return { ok: false, error: fetchErr.message }
  if (!row) return { ok: false, error: 'Comment not found' }

  const r = row as {
    id: string
    user_id: string
    platform: string
    platform_post_id: string
    platform_fan_id: string
    fan_username: string | null
    fan_display_name: string | null
    comment_text: string
    source: string
    analysis_status: string
    post_fan_access_tier?: string | null
    fan_may_comment_without_unlock?: boolean | null
  }

  if (r.analysis_status !== 'pending') {
    return { ok: true }
  }

  if (!process.env.OPENAI_API_KEY) {
    await supabase
      .from('platform_post_comments')
      .update({ analysis_status: 'failed' })
      .eq('id', commentId)
    return { ok: false, error: 'OPENAI_API_KEY not configured' }
  }

  const [{ data: ins }, { data: settings }, { data: fanRow }] = await Promise.all([
    supabase
      .from('fan_thread_insights')
      .select('profile_json, thread_snapshot_text')
      .eq('user_id', r.user_id)
      .eq('platform', r.platform)
      .eq('platform_fan_id', r.platform_fan_id)
      .maybeSingle(),
    supabase
      .from('divine_manager_settings')
      .select('persona, automation_rules')
      .eq('user_id', r.user_id)
      .maybeSingle(),
    supabase
      .from('fans')
      .select(
        'platform_about, creator_classification, treat_as_fan_for_automation, username, display_name, subscription_account_type, subscription_price, subscription_status',
      )
      .eq('user_id', r.user_id)
      .eq('platform', r.platform)
      .eq('platform_fan_id', r.platform_fan_id)
      .maybeSingle(),
  ])

  const fr = fanRow as {
    platform_about?: string | null
    creator_classification?: string | null
    treat_as_fan_for_automation?: boolean | null
    username?: string | null
    display_name?: string | null
    subscription_account_type?: string | null
    subscription_price?: string | number | null
    subscription_status?: string | null
  } | null

  if (!opts?.bypassCreatorResourceSkip) {
    const rules = (settings as { automation_rules?: { alerts?: { skip_expensive_ai_for_creator_likely?: boolean } } } | null)
      ?.automation_rules
    const policy = policySkipExpensiveAiForCreatorLikely(rules?.alerts)
    const threadSnap =
      typeof (ins as { thread_snapshot_text?: string | null } | null)?.thread_snapshot_text === 'string'
        ? (ins as { thread_snapshot_text: string }).thread_snapshot_text
        : null
    const commentBit = r.comment_text?.trim()
      ? `Comment on post: ${r.comment_text.trim().slice(0, 2000)}`
      : ''
    const threadHay =
      [threadSnap, commentBit].filter((x) => typeof x === 'string' && x.trim().length > 0).join('\n').slice(0, 8000) ||
      null
    const { skip } = shouldSkipExpensiveAiForContact({
      platformAbout: fr?.platform_about ?? null,
      username: fr?.username ?? r.fan_username,
      displayName: fr?.display_name ?? r.fan_display_name,
      threadExcerpt: threadHay,
      treatAsFanForAutomation: fr?.treat_as_fan_for_automation === true,
      creatorClassification: fr?.creator_classification ?? null,
      policySkipWhenLikelyCreator: policy,
    })
    if (skip) {
      await supabase
        .from('platform_post_comments')
        .update({ analysis_status: 'skipped' })
        .eq('id', commentId)
      return { ok: true, skipped: true }
    }
  }

  const threadExcerpt = threadExcerptFromProfileJson(
    (ins as { profile_json?: unknown } | null)?.profile_json ?? null,
  )
  const persona = (settings as { persona?: unknown } | null)?.persona
  const creatorPersonaExcerpt =
    persona && typeof persona === 'object' ? JSON.stringify(persona).slice(0, 2000) : null
  const salesIntensity = parseSalesIntensity(
    (settings as { automation_rules?: unknown } | null)?.automation_rules,
  )

  const subPriceRaw = fr?.subscription_price
  const subPrice =
    subPriceRaw != null && !Number.isNaN(Number(subPriceRaw)) ? Number(subPriceRaw) : null
  const fanCommerceLine = formatFanCommerceContextForAi({
    subscriptionAccountType: (fr?.subscription_account_type as SubscriptionAccountType) || 'unknown',
    subscriptionPrice: subPrice,
    subscriptionStatus: fr?.subscription_status,
  })
  const postAccessLine = formatCommentPostAccessForAi({
    postFanAccessTier: parseFanAccessTier(r.post_fan_access_tier),
    fanMayCommentWithoutUnlock: r.fan_may_comment_without_unlock !== false,
  })

  let output: Awaited<ReturnType<typeof analyzePostCommentWithAi>>
  try {
    output = await analyzePostCommentWithAi({
      commentText: r.comment_text,
      source: r.source as 'post' | 'story' | 'stream',
      platformPostId: r.platform_post_id,
      fanUsername: r.fan_username,
      fanDisplayName: r.fan_display_name,
      threadProfileExcerpt: threadExcerpt,
      creatorPersonaExcerpt,
      salesIntensity,
      fanCommerceLine,
      postAccessLine,
    })
  } catch (e) {
    await supabase
      .from('platform_post_comments')
      .update({ analysis_status: 'failed' })
      .eq('id', commentId)
    return { ok: false, error: e instanceof Error ? e.message : 'AI analysis failed' }
  }

  const analysisJson = { ...output, analyzed_at: new Date().toISOString() }
  const model = 'openai/gpt-4o-mini'

  await supabase.from('post_comment_analyses').delete().eq('comment_id', commentId)
  const { error: anErr } = await supabase.from('post_comment_analyses').insert({
    comment_id: commentId,
    analysis_json: analysisJson,
    model,
  })
  if (anErr) {
    await supabase
      .from('platform_post_comments')
      .update({ analysis_status: 'failed' })
      .eq('id', commentId)
    return { ok: false, error: anErr.message }
  }

  await supabase.from('post_comment_reply_suggestions').delete().eq('comment_id', commentId)
  const voiceRows = [
    { voice: 'circe' as const, text: output.replies.circe },
    { voice: 'venus' as const, text: output.replies.venus },
    { voice: 'flirt' as const, text: output.replies.flirt },
    { voice: 'professional' as const, text: output.replies.professional },
    { voice: 'best' as const, text: output.replies.best_reply },
  ]
  const { error: sgErr } = await supabase.from('post_comment_reply_suggestions').insert(
    voiceRows.map((v) => ({
      comment_id: commentId,
      voice: v.voice,
      suggestion_text: v.text,
      is_ai_generated: true,
    })),
  )
  if (sgErr) {
    await supabase
      .from('platform_post_comments')
      .update({ analysis_status: 'failed' })
      .eq('id', commentId)
    return { ok: false, error: sgErr.message }
  }

  await supabase
    .from('platform_post_comments')
    .update({ analysis_status: 'done' })
    .eq('id', commentId)

  const delta = output.fan_profile_delta
  if (delta && ((delta.signals_from_comments?.length ?? 0) > 0 || delta.notes?.trim())) {
    await mergeCommentDeltaIntoFanProfile(supabase, r.user_id, r.platform, r.platform_fan_id, {
      signals_from_comments: delta.signals_from_comments,
      notes: delta.notes ?? null,
    })
  }

  const safety = output.safety_level
  const stalky = (output.stalking_signals?.length ?? 0) > 0
  if (safety === 'critical' || safety === 'high' || (safety === 'medium' && stalky)) {
    await insertDivineAppNotification(supabase, r.user_id, {
      type: 'protection',
      title: 'Commenter: review fan safety',
      description: `@${r.fan_username || r.platform_fan_id}: ${output.stalking_signals.slice(0, 2).join('; ') || output.discomfort_notes || 'Elevated risk signals on a public comment.'}`.slice(
        0,
        1900,
      ),
      link: `/dashboard/commenter?highlight=${encodeURIComponent(commentId)}`,
      platform: 'onlyfans',
      platform_fan_id: r.platform_fan_id,
      metadata: {
        kind: 'commenter_safety',
        comment_id: commentId,
        safety_level: safety,
      },
    })
  }

  return { ok: true }
}
