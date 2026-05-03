import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchDmReplySuggestionsPackage } from '@/lib/divine/dm-reply-package'
import { parseMimicProfile, type MimicProfileV1, DEFAULT_MIMIC_PROFILE } from '@/lib/divine/mimic-types'
import { executeSendMessage } from '@/lib/divine-intent-actions'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { refreshFanThreadInsight } from '@/lib/divine/fan-thread-insight'
import {
  parseAiChatterSettings,
  type AiChatterEngagementProfile,
  type AiChatterSettings,
} from '@/lib/divine/ai-chatter-types'
import {
  policySkipExpensiveAiForCreatorLikely,
  shouldSkipExpensiveAiForContact,
} from '@/lib/divine/creator-resource-policy'
import { formatContentAccessForAiSnippet, parseFanAccessTier } from '@/lib/fans/fan-access-tier'
import { formatFanCommerceContextForAi, type SubscriptionAccountType } from '@/lib/fans/subscription-account-type'
import {
  formatCreatorOnlyFansPageModelForAi,
  parseOnlyFansCreatorPageModel,
} from '@/lib/onlyfans/creator-page-model'
import { logAiUsageEvent } from '@/lib/usage/server-log'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { ledgerDebitOptsForBillingTool } from '@/lib/billing/credit-reason-label'
import { consumeAiCredits } from '@/lib/billing/consume-ai-credits'
import { createOpenAiBackgroundJob } from '@/lib/openai/background-jobs'

const OPENAI_MODEL = 'gpt-4o-mini'

const AI_CHATTER_BG_MIN_CHARS = 4200

export type AiChatterRunResult =
  | { ok: true; action: 'skipped'; reason: string }
  | { ok: true; action: 'draft_queued'; outboxId?: string }
  | { ok: true; action: 'sent' }
  | { ok: true; action: 'compose_queued'; jobId?: string }
  | { ok: false; error: string }

export type AiChatterComposePromptOpts = {
  mimic: MimicProfileV1
  thread: string
  scanBits: string
  vaultSnippet: string
  giftWishlistSnippet: string
  whaleNurture: boolean
  engagementProfile: AiChatterEngagementProfile
  fanCommerceLine?: string
  creatorPageLine?: string
}

export function buildAiChatterComposePrompts(opts: AiChatterComposePromptOpts): { system: string; user: string } {
  const human = ['none', 'very rare small typos', 'occasional casual typos', 'more informal typos'][
    Math.min(3, Math.max(0, opts.mimic.humanizationLevel ?? 1))
  ]

  let goal: string
  if (opts.engagementProfile === 'whale_whisper') {
    goal =
      'VIP stewardship: they are a top supporter—make them feel uniquely seen and valued. Warmth and gratitude first. You may softly reference exclusive content or experiences only if the thread naturally invites it—never hard-sell or spam.'
  } else if (opts.whaleNurture) {
    goal =
      'Gently deepen engagement and interest in exclusive / PPV content when natural—do not be pushy or spammy. Build rapport first.'
  } else {
    goal = 'Reply naturally and helpfully to keep the conversation warm.'
  }

  const system = `You write ONE short DM as the creator, matching their Mimic voice.
Rules:
- Stay within taboo topics and banned phrases; never use banned phrases.
- Output ONLY the message text (no quotes, no preamble). Max ~600 characters unless the thread clearly needs a bit more.
- Do not say you are an AI.
- Humanization: ${human}.
- ${goal}
- Respect fan subscription context: free-page followers may not see paywalled feed posts; PPV items in the vault list may still need a separate unlock. Match explicitness to NSFW vs non-explicit vault labels.
- If vault ideas are listed, you may subtly reference themes that fit the thread; do not invent prices or guarantees.
- If gift wishlist ideas are listed, you may hint at gratitude or optional gift-style treats only when appropriate; never claim you already purchased anything.`

  const user = `Mimic profile (JSON):
${JSON.stringify(
  {
    toneWarmth: opts.mimic.toneWarmth,
    flirtCeiling: opts.mimic.flirtCeiling,
    humorLevel: opts.mimic.humorLevel,
    tabooTopics: opts.mimic.tabooTopics,
    bannedPhrases: opts.mimic.bannedPhrases,
    signaturePhrases: opts.mimic.signaturePhrases,
    exemplarReplies: (opts.mimic.exemplarReplies ?? []).slice(0, 5),
    notes: opts.mimic.notes,
  },
  null,
  2,
)}

${opts.creatorPageLine ? `Creator business model (OnlyFans page):\n${opts.creatorPageLine.slice(0, 1200)}\n` : ''}
${opts.fanCommerceLine ? `Fan subscription / access (CRM):\n${opts.fanCommerceLine.slice(0, 1200)}\n` : ''}
Recent thread:
${opts.thread.slice(0, 8000)}

${opts.scanBits ? `Context: ${opts.scanBits}\n` : ''}
${opts.vaultSnippet ? `Vault / content ideas (teasers only, optional):\n${opts.vaultSnippet.slice(0, 4000)}\n` : ''}
${opts.giftWishlistSnippet ? `Creator gift / treat ideas (optional references only):\n${opts.giftWishlistSnippet.slice(0, 3000)}\n` : ''}

Write one reply.`

  return { system, user }
}

type AutomationRow = {
  id: string
  user_id: string
  platform: string
  fan_id: string
  platform_fan_id: string
  fan_username: string | null
  status: string
  settings: unknown
  beta_acknowledged_at: string | null
  last_processed_at: string | null
  last_processed_message_id: string | null
  replies_today: number
  replies_day_utc: string | null
  last_outbound_at: string | null
}

async function logEvent(
  supabase: SupabaseClient,
  automationId: string,
  userId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  await supabase.from('ai_chatter_events').insert({
    automation_id: automationId,
    user_id: userId,
    type,
    payload,
  })
}

function utcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

async function bumpAiCredits(supabase: SupabaseClient, userId: string): Promise<void> {
  await consumeAiCredits(supabase, userId, getCreditsForToolId('ai-chatter'), ledgerDebitOptsForBillingTool('ai-chatter'))
}

async function loadVaultSnippet(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('content')
    .select('title, content_type, sales_notes, teaser_tags, is_nsfw, fan_access_tier')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(12)
  if (!data?.length) return ''
  return data
    .map(
      (row: {
        title?: string
        content_type?: string | null
        sales_notes?: string | null
        teaser_tags?: unknown
        is_nsfw?: boolean | null
        fan_access_tier?: string | null
      }) => {
        const tags = Array.isArray(row.teaser_tags) ? (row.teaser_tags as string[]).slice(0, 4).join(', ') : ''
        const sales = row.sales_notes?.trim() ? row.sales_notes.trim().slice(0, 200) : ''
        const head = formatContentAccessForAiSnippet({
          title: row.title ?? 'Untitled',
          contentType: row.content_type,
          isNsfw: row.is_nsfw !== false,
          fanAccessTier: parseFanAccessTier(row.fan_access_tier),
        })
        return `- ${head}${sales ? ` — ${sales}` : ''}${tags ? ` [${tags}]` : ''}`
      },
    )
    .join('\n')
}

async function loadGiftWishlistSnippet(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('creator_gift_wishlist_items')
    .select('title, description, url, price_amount, price_currency, fetch_status')
    .eq('user_id', userId)
    .eq('fetch_status', 'ok')
    .order('updated_at', { ascending: false })
    .limit(24)
  if (!data?.length) return ''
  return data
    .map(
      (row: {
        title?: string | null
        description?: string | null
        url?: string
        price_amount?: number | null
        price_currency?: string | null
        fetch_status?: string
      }) => {
        const title = row.title?.trim() || row.url || 'Item'
        const desc = row.description?.trim() ? row.description.trim().slice(0, 160) : ''
        const price =
          row.price_amount != null
            ? ` ~${row.price_amount} ${row.price_currency || 'USD'}`
            : ''
        const status = row.fetch_status === 'pending' ? ' (metadata pending)' : ''
        return `- ${title}${price}${status}${desc ? ` — ${desc}` : ''}`
      },
    )
    .join('\n')
}

function matchesEscalation(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase()
  return keywords.some((k) => k.length > 0 && t.includes(k))
}

function scanRiskFlags(pkg: { scan?: { riskFlags?: string[] } | null }): string[] {
  const rf = pkg.scan?.riskFlags
  return Array.isArray(rf) ? rf.filter((x): x is string => typeof x === 'string') : []
}

async function composeChatterMessage(
  opts: AiChatterComposePromptOpts & { userId: string },
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY is not configured.' }

  const { system, user } = buildAiChatterComposePrompts(opts)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.72,
      max_tokens: 500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  type CompletionJson = {
    id?: string
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  }

  const rawText = await res.text().catch(() => '')
  let data: CompletionJson = {}
  try {
    data = JSON.parse(rawText) as CompletionJson
  } catch {
    data = {}
  }

  const inTok = Math.max(0, Math.floor(data.usage?.prompt_tokens ?? 0))
  const outTok = Math.max(0, Math.floor(data.usage?.completion_tokens ?? 0))
  const okHttp = res.ok
  const text = data.choices?.[0]?.message?.content?.trim() ?? ''
  const ok = okHttp && Boolean(text)

  logAiUsageEvent({
    userId: opts.userId,
    feature: 'ai_chatter_compose',
    provider: 'openai',
    model: OPENAI_MODEL,
    inputTokens: inTok,
    outputTokens: outTok,
    totalTokens:
      data.usage?.total_tokens != null
        ? Math.max(0, Math.floor(data.usage.total_tokens))
        : inTok + outTok,
    requestId: typeof data.id === 'string' ? data.id : null,
    success: ok,
    metadata: ok
      ? undefined
      : {
          http_ok: okHttp,
          snippet: rawText.slice(0, 500),
        },
  })

  if (!okHttp) {
    return { ok: false, error: `Compose failed: ${rawText.slice(0, 200)}` }
  }
  if (!text) return { ok: false, error: 'Empty message from model.' }
  return { ok: true, text }
}

function canAutoSend(
  settings: AiChatterSettings,
  betaAt: string | null,
  mimic: MimicProfileV1,
): { ok: boolean; reason?: string } {
  if (!betaAt) return { ok: false, reason: 'beta_not_acknowledged' }
  if (settings.send_mode === 'queue_review') return { ok: false, reason: 'queue_review_mode' }
  if (!mimic.consentFanFacingDrafts) return { ok: false, reason: 'no_mimic_consent' }

  if (settings.send_mode === 'auto_send_opt_in') {
    if (mimic.neverSendWithoutReview !== false && !settings.bypass_mimic_review_gate) {
      return { ok: false, reason: 'mimic_review_gate' }
    }
    return { ok: true }
  }

  if (settings.send_mode === 'experimental_auto') {
    if (!settings.bypass_mimic_review_gate) {
      return { ok: false, reason: 'experimental_requires_bypass' }
    }
    return { ok: true }
  }
  return { ok: false, reason: 'unknown_mode' }
}

/**
 * Run AI Chatter for one inbound OnlyFans message id (webhook or cron).
 */
export async function runAiChatterForInboundMessage(
  supabase: SupabaseClient,
  opts: {
    userId: string
    platformFanId: string
    inboundMessageId: string
    inboundText?: string
  },
): Promise<AiChatterRunResult> {
  const { userId, platformFanId, inboundMessageId, inboundText = '' } = opts

  const { data: auto, error: autoErr } = await supabase
    .from('ai_chatter_automations')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('platform_fan_id', platformFanId)
    .eq('status', 'active')
    .maybeSingle()

  if (autoErr || !auto) {
    return { ok: true, action: 'skipped', reason: 'no_active_automation' }
  }

  const row = auto as AutomationRow
  if (row.last_processed_message_id === inboundMessageId) {
    return { ok: true, action: 'skipped', reason: 'already_processed' }
  }

  const settings = parseAiChatterSettings(row.settings)
  const isWhaleWhisper = settings.engagement_profile === 'whale_whisper'
  const riskTitlePrefix = isWhaleWhisper ? 'Whale whisper' : 'AI Chatter'

  const { data: fan } = await supabase
    .from('fans')
    .select(
      'id, is_blocked, username, display_name, platform_about, creator_classification, treat_as_fan_for_automation, subscription_account_type, subscription_price, subscription_status',
    )
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()
  if ((fan as { is_blocked?: boolean } | null)?.is_blocked) {
    await logEvent(supabase, row.id, userId, 'skipped', { reason: 'fan_blocked' })
    return { ok: true, action: 'skipped', reason: 'fan_blocked' }
  }

  const { data: settingsRow } = await supabase
    .from('divine_manager_settings')
    .select('mimic_profile, automation_rules')
    .eq('user_id', userId)
    .maybeSingle()
  const mimic = parseMimicProfile((settingsRow as { mimic_profile?: unknown } | null)?.mimic_profile) ?? {
    ...DEFAULT_MIMIC_PROFILE,
  }

  if (!mimic.consentFanFacingDrafts) {
    await logEvent(supabase, row.id, userId, 'skipped', { reason: 'no_mimic_consent' })
    return { ok: true, action: 'skipped', reason: 'no_mimic_consent' }
  }

  const day = utcDayString()
  let repliesToday = row.replies_today ?? 0
  if (row.replies_day_utc !== day) {
    repliesToday = 0
  }
  if (repliesToday >= settings.max_replies_per_day) {
    await supabase
      .from('ai_chatter_automations')
      .update({
        last_processed_message_id: inboundMessageId,
        last_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    await logEvent(supabase, row.id, userId, 'skipped', { reason: 'daily_cap' })
    return { ok: true, action: 'skipped', reason: 'daily_cap' }
  }

  if (row.last_outbound_at && settings.min_minutes_between_sends > 0) {
    const delta = Date.now() - new Date(row.last_outbound_at).getTime()
    if (delta < settings.min_minutes_between_sends * 60_000) {
      await supabase
        .from('ai_chatter_automations')
        .update({
          last_processed_message_id: inboundMessageId,
          last_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      await logEvent(supabase, row.id, userId, 'skipped', { reason: 'cooldown' })
      return { ok: true, action: 'skipped', reason: 'cooldown' }
    }
  }

  const pkg = await fetchDmReplySuggestionsPackage(supabase, userId, { fanId: platformFanId })
  if ('error' in pkg && pkg.error) {
    await logEvent(supabase, row.id, userId, 'error', { error: pkg.error })
    return { ok: false, error: pkg.error }
  }
  if ('message' in pkg && pkg.message === 'No messages in thread.') {
    await logEvent(supabase, row.id, userId, 'skipped', { reason: 'no_thread' })
    return { ok: true, action: 'skipped', reason: 'no_thread' }
  }

  const dmRules = (settingsRow as { automation_rules?: { alerts?: { skip_expensive_ai_for_creator_likely?: boolean } } } | null)
    ?.automation_rules
  const policySkip = policySkipExpensiveAiForCreatorLikely(dmRules?.alerts)
  const fanRow = fan as {
    platform_about?: string | null
    creator_classification?: string | null
    treat_as_fan_for_automation?: boolean | null
    username?: string | null
    display_name?: string | null
    subscription_account_type?: string | null
    subscription_price?: string | number | null
    subscription_status?: string | null
  } | null
  const { data: insightSnap } = await supabase
    .from('fan_thread_insights')
    .select('thread_snapshot_text')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()
  const snapText =
    typeof (insightSnap as { thread_snapshot_text?: string | null } | null)?.thread_snapshot_text === 'string'
      ? (insightSnap as { thread_snapshot_text: string }).thread_snapshot_text
      : null
  const threadForPolicy = [pkg.threadPreview, snapText].filter(Boolean).join('\n').slice(0, 8000)
  const { skip: skipCreatorResource, reason: creatorSkipReason } = shouldSkipExpensiveAiForContact({
    platformAbout: fanRow?.platform_about ?? null,
    username: fanRow?.username ?? row.fan_username,
    displayName: fanRow?.display_name ?? null,
    threadExcerpt: threadForPolicy || null,
    treatAsFanForAutomation: fanRow?.treat_as_fan_for_automation === true,
    creatorClassification: fanRow?.creator_classification ?? null,
    policySkipWhenLikelyCreator: policySkip,
  })
  if (skipCreatorResource) {
    await supabase
      .from('ai_chatter_automations')
      .update({
        last_processed_message_id: inboundMessageId,
        last_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    await logEvent(supabase, row.id, userId, 'skipped', {
      reason: 'creator_resource_policy',
      detail: creatorSkipReason ?? 'creator_likely',
    })
    return { ok: true, action: 'skipped', reason: 'creator_resource_policy' }
  }

  const risks = scanRiskFlags(pkg as { scan?: { riskFlags?: string[] } })
  if (risks.length > 0 && settings.notify_on_risk) {
    await insertDivineAppNotification(supabase, userId, {
      type: 'fan',
      title: `${riskTitlePrefix}: thread risk flags`,
      description: `${row.fan_username ?? platformFanId}: ${risks.slice(0, 3).join('; ')}`,
      link: `/dashboard/messages?fanId=${encodeURIComponent(platformFanId)}`,
      platform: 'onlyfans',
      platform_fan_id: platformFanId,
      metadata: { kind: 'ai_chatter_risk', automation_id: row.id, risks },
    })
  }

  const combinedText = `${inboundText}\n${pkg.threadPreview ?? ''}`
  if (
    settings.escalation_keywords.length > 0 &&
    matchesEscalation(combinedText, settings.escalation_keywords)
  ) {
    await logEvent(supabase, row.id, userId, 'escalated', { reason: 'keyword' })
    if (settings.notify_on_risk) {
      await insertDivineAppNotification(supabase, userId, {
        type: 'system',
        title: `${riskTitlePrefix}: attention needed`,
        description: `Keyword escalation for @${row.fan_username ?? platformFanId}. Review the thread.`,
        link: `/dashboard/messages?fanId=${encodeURIComponent(platformFanId)}`,
        platform: 'onlyfans',
        platform_fan_id: platformFanId,
        metadata: { kind: 'ai_chatter_keyword', automation_id: row.id },
      })
    }
    await supabase
      .from('ai_chatter_automations')
      .update({
        last_processed_message_id: inboundMessageId,
        last_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    return { ok: true, action: 'skipped', reason: 'escalation_keyword' }
  }

  const scanBits =
    (pkg.scan as { insights?: string[] } | null)?.insights?.length
      ? `Insights: ${(pkg.scan as { insights: string[] }).insights.slice(0, 4).join('; ')}`
      : ''
  const vaultSnippet = await loadVaultSnippet(supabase, userId)
  const giftSnippet =
    settings.use_gift_wishlist ? await loadGiftWishlistSnippet(supabase, userId) : ''

  const subP =
    fanRow?.subscription_price != null && !Number.isNaN(Number(fanRow.subscription_price))
      ? Number(fanRow.subscription_price)
      : null
  const fanCommerceLine = formatFanCommerceContextForAi({
    subscriptionAccountType: (fanRow?.subscription_account_type as SubscriptionAccountType) || 'unknown',
    subscriptionPrice: subP,
    subscriptionStatus: fanRow?.subscription_status,
  })

  const { data: ofConn } = await supabase
    .from('platform_connections')
    .select('onlyfans_creator_page_model')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()
  const creatorPageLine = formatCreatorOnlyFansPageModelForAi(
    parseOnlyFansCreatorPageModel(
      (ofConn as { onlyfans_creator_page_model?: string | null } | null)?.onlyfans_creator_page_model,
    ),
  )

  const composeCtx: AiChatterComposePromptOpts = {
    mimic,
    thread: pkg.threadPreview || '',
    scanBits,
    vaultSnippet,
    giftWishlistSnippet: giftSnippet,
    whaleNurture: settings.whale_nurture_tone,
    engagementProfile: settings.engagement_profile,
    fanCommerceLine,
    creatorPageLine,
  }

  const pr = buildAiChatterComposePrompts(composeCtx)
  const useBg =
    Boolean(process.env.OPENAI_WEBHOOK_SECRET?.trim()) &&
    pr.system.length + pr.user.length >= AI_CHATTER_BG_MIN_CHARS

  if (useBg) {
    const queued = await createOpenAiBackgroundJob({
      userId,
      feature: 'ai_chatter',
      instructions: pr.system,
      input: pr.user,
      model: OPENAI_MODEL,
      requestMetadata: {
        automationId: row.id,
        platformFanId,
        inboundMessageId,
        repliesToday,
        day,
        isWhaleWhisper: settings.engagement_profile === 'whale_whisper',
        fan_username: row.fan_username,
        mimic,
        settings,
        beta_acknowledged_at: row.beta_acknowledged_at,
      },
    })
    if (queued.ok && queued.jobId) {
      await supabase
        .from('ai_chatter_automations')
        .update({
          last_processed_message_id: inboundMessageId,
          last_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      await logEvent(supabase, row.id, userId, 'compose_queued_background', {
        job_id: queued.jobId,
        inbound_message_id: inboundMessageId,
      })
      return { ok: true, action: 'compose_queued', jobId: queued.jobId }
    }
  }

  const composed = await composeChatterMessage({
    userId,
    ...composeCtx,
  })
  if (!composed.ok) {
    await logEvent(supabase, row.id, userId, 'error', { error: composed.error })
    return { ok: false, error: composed.error }
  }

  await bumpAiCredits(supabase, userId)

  const autoDecision = canAutoSend(settings, row.beta_acknowledged_at, mimic)
  const mustQueueOnly =
    settings.engagement_profile === 'whale_whisper' ||
    !autoDecision.ok ||
    settings.send_mode === 'queue_review'

  const patchAutomation = {
    last_processed_message_id: inboundMessageId,
    last_processed_at: new Date().toISOString(),
    replies_today: repliesToday + 1,
    replies_day_utc: day,
    updated_at: new Date().toISOString(),
  }

  if (mustQueueOnly) {
    const { data: out, error: outErr } = await supabase
      .from('ai_chatter_outbox')
      .insert({
        automation_id: row.id,
        user_id: userId,
        platform: 'onlyfans',
        platform_fan_id: platformFanId,
        draft_text: composed.text,
        inbound_message_id: inboundMessageId,
        status: 'pending',
      })
      .select('id')
      .single()
    if (outErr) {
      await logEvent(supabase, row.id, userId, 'error', { error: outErr.message })
      return { ok: false, error: outErr.message }
    }
    await supabase.from('ai_chatter_automations').update(patchAutomation).eq('id', row.id)
    await logEvent(supabase, row.id, userId, 'draft_created', {
      outbox_id: (out as { id: string }).id,
      auto_send_blocked: autoDecision.reason ?? null,
    })
    await insertDivineAppNotification(supabase, userId, {
      type: 'message',
      title: isWhaleWhisper ? 'Whale whisper: draft ready' : 'AI Chatter draft ready',
      description: `Review suggested reply for @${row.fan_username ?? platformFanId}.`,
      link: `/dashboard/messages?fanId=${encodeURIComponent(platformFanId)}&chatterDraft=${encodeURIComponent((out as { id: string }).id)}`,
      platform: 'onlyfans',
      platform_fan_id: platformFanId,
      metadata: { kind: 'ai_chatter_draft', outbox_id: (out as { id: string }).id },
    })
    return { ok: true, action: 'draft_queued', outboxId: (out as { id: string }).id }
  }

  const send = await executeSendMessage(supabase, userId, {
    fanId: platformFanId,
    message: composed.text,
    platform: 'onlyfans',
  })
  if (!send.success) {
    await logEvent(supabase, row.id, userId, 'error', { error: send.summary })
    return { ok: false, error: send.summary }
  }

  await supabase
    .from('ai_chatter_automations')
    .update({
      ...patchAutomation,
      last_outbound_at: new Date().toISOString(),
    })
    .eq('id', row.id)
  await logEvent(supabase, row.id, userId, 'sent', { inbound_message_id: inboundMessageId })
  return { ok: true, action: 'sent' }
}

/**
 * Cron: find active automations whose latest inbound OF message is newer than last processed.
 */
export async function sweepAiChatterStaleInboxes(supabase: SupabaseClient): Promise<{
  processed: number
  errors: number
}> {
  let processed = 0
  let errors = 0

  const { data: autos } = await supabase
    .from('ai_chatter_automations')
    .select('id, user_id, platform_fan_id')
    .eq('platform', 'onlyfans')
    .eq('status', 'active')

  for (const a of autos ?? []) {
    const row = a as { id: string; user_id: string; platform_fan_id: string }
    const { data: msg } = await supabase
      .from('messages')
      .select('platform_message_id, content, received_at')
      .eq('user_id', row.user_id)
      .eq('platform', 'onlyfans')
      .eq('from_fan_id', row.platform_fan_id)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const mid = String((msg as { platform_message_id?: string } | null)?.platform_message_id ?? '')
    if (!mid) continue

    const { data: cur } = await supabase
      .from('ai_chatter_automations')
      .select('last_processed_message_id')
      .eq('id', row.id)
      .single()
    const last = String((cur as { last_processed_message_id?: string | null } | null)?.last_processed_message_id ?? '')
    if (last === mid) continue

    try {
      const r = await runAiChatterForInboundMessage(supabase, {
        userId: row.user_id,
        platformFanId: row.platform_fan_id,
        inboundMessageId: mid,
        inboundText: String((msg as { content?: string }).content ?? ''),
      })
      if (r.ok && r.action !== 'skipped') processed += 1
      if (!r.ok) errors += 1
    } catch {
      errors += 1
    }
  }

  return { processed, errors }
}

/**
 * Activate helper: refresh thread insight for the fan (best-effort).
 */
export async function primeAiChatterThread(
  supabase: SupabaseClient,
  userId: string,
  platformFanId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await refreshFanThreadInsight(supabase, userId, platformFanId, {
      platform: 'onlyfans',
      mode: 'thread_update',
      latestFanMessageAt: new Date().toISOString(),
      skipDebounce: true,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'refresh failed' }
  }
}
