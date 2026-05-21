/**
 * OpenAI Responses webhook processor (heavy work runs after returning 200 to OpenAI).
 */
import crypto from 'crypto'
import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { estimateUsdFromTokens, getUnitCostRow } from '@/lib/usage/estimate-cost'
import { logUsageEvent, logApiError } from '@/lib/usage/server-log'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { extractResponsesOutputText } from '@/lib/openai/extract-response-text'
import type { OpenaiJobRow } from '@/lib/openai/openai-job-feature'
import { runDmThreadScanWork } from '@/lib/divine/thread-scan-async'
import { persistCirceChurnMarkdownDigest } from '@/lib/circe-churn/churn-finale'
import type { CirceChurnSettingsRow } from '@/lib/circe-churn/circe-churn-types'

type LedgerReservation = { duplicate: true } | { duplicate: false }

function utcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

async function reserveWebhookEventLedger(
  supabase: SupabaseClient,
  args: { webhookId: string; eventType: string; payloadHash: string },
): Promise<LedgerReservation> {
  const { error } = await supabase.from('platform_webhook_event_ledger').insert({
    platform: 'openai',
    event_type: args.eventType,
    event_id: args.webhookId,
    payload_hash: args.payloadHash,
    status: 'received',
    received_at: new Date().toISOString(),
  })
  if (!error) return { duplicate: false }
  if (error.code === '23505') return { duplicate: true }
  console.warn('[openai webhook] ledger insert failed', error.message)
  return { duplicate: false }
}

function usageFromOpenAiResponse(payload: Record<string, unknown>): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
} {
  const u = payload.usage as Record<string, unknown> | undefined
  if (!u || typeof u !== 'object')
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  const input = Math.max(
    0,
    Math.floor(Number(u.prompt_tokens ?? u.input_tokens ?? (u as { input?: number }).input ?? 0)),
  )
  const output = Math.max(
    0,
    Math.floor(Number(u.completion_tokens ?? u.output_tokens ?? (u as { output?: number }).output ?? 0)),
  )
  const totalRaw = Number(u.total_tokens ?? u.total ?? input + output)
  const total = Math.max(0, Math.floor(Number.isFinite(totalRaw) ? totalRaw : input + output))
  return {
    promptTokens: input,
    completionTokens: output,
    totalTokens: total || input + output,
  }
}

async function finalizeJobBasics(opts: {
  supabase: SupabaseClient
  job: OpenaiJobRow
  responsePayload: Record<string, unknown>
  success: boolean
  error?: string | null
  resultSummary?: Record<string, unknown> | null
}) {
  const { supabase, job } = opts
  const usage = usageFromOpenAiResponse(opts.responsePayload)
  const model =
    typeof opts.responsePayload.model === 'string'
      ? opts.responsePayload.model
      : typeof job.model === 'string'
        ? job.model
        : String(process.env.OPENAI_BACKGROUND_RESPONSES_MODEL ?? 'gpt-4o-mini')
  let estimated = 0
  try {
    const rowCost = await getUnitCostRow(supabase, model)
    estimated = estimateUsdFromTokens(usage.promptTokens, usage.completionTokens, rowCost)
  } catch {
    estimated = 0
  }

  const completedAt = new Date().toISOString()
  await supabase
    .from('openai_jobs')
    .update({
      status: opts.success ? 'completed' : 'failed',
      error_message: opts.success ? null : (opts.error ?? 'failed').slice(0, 4000),
      result_summary: opts.resultSummary ?? null,
      usage_input_tokens: usage.promptTokens,
      usage_output_tokens: usage.completionTokens,
      usage_total_tokens: usage.totalTokens,
      estimated_usd: estimated,
      completed_at: completedAt,
      model,
    })
    .eq('id', job.id)

  if (job.divine_manager_task_id) {
    await supabase
      .from('divine_manager_tasks')
      .update({
        status: opts.success ? 'executed' : 'failed',
        payload: {
          ...((job.request_metadata as Record<string, unknown>) ?? {}),
          openai_job_id: job.id,
          error: opts.success ? undefined : opts.error,
        },
        updated_at: completedAt,
      })
      .eq('id', job.divine_manager_task_id)
  }

  if (opts.success) {
    logUsageEvent({
      userId: job.user_id,
      feature: job.feature,
      provider: 'openai',
      model,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
      requestId: typeof opts.responsePayload.id === 'string' ? opts.responsePayload.id : job.response_id,
      metadata: {
        openai_job_id: job.id,
        kind: 'background_webhook',
        divine_manager_task_id: job.divine_manager_task_id,
      },
    })
  } else {
    logApiError({
      userId: job.user_id,
      route: '/api/openai/webhook',
      message: opts.error ?? 'openai job failed',
      safeContext: { feature: job.feature, job_id: job.id },
    })
    await insertDivineAppNotification(supabase, job.user_id, {
      type: 'system',
      title: 'Background AI job failed',
      description: `${job.feature}: ${String(opts.error ?? 'unknown').slice(0, 400)}`,
      link: '/dashboard/divine-manager',
      metadata: { openai_job_id: job.id, feature: job.feature },
    })
  }
}

async function handleFeatureCompleted(
  supabase: SupabaseClient,
  job: OpenaiJobRow,
  responsePayload: Record<string, unknown>,
): Promise<void> {
  const text = extractResponsesOutputText(responsePayload)
  const meta = (job.request_metadata ?? {}) as Record<string, unknown>

  if (job.feature === 'divine_thread_scan') {
    const taskId = typeof meta.voiceTaskId === 'string' ? meta.voiceTaskId : ''
    const fanId = typeof meta.fanId === 'string' ? meta.fanId : ''
    const createdAt = typeof meta.createdAt === 'string' ? meta.createdAt : new Date().toISOString()
    const hp = meta.highlightPanel
    const highlightPanel =
      hp === 'circe' || hp === 'venus' || hp === 'flirt' ? hp : null
    if (!taskId || !fanId) {
      await finalizeJobBasics({
        supabase,
        job,
        responsePayload,
        success: false,
        error: 'missing_voice_task_meta',
      })
      return
    }
    const r = await runDmThreadScanWork(supabase, job.user_id, {
      taskId,
      fanId,
      highlightPanel,
      createdAt,
    })
    await finalizeJobBasics({
      supabase,
      job,
      responsePayload,
      success: r.ok,
      error: r.ok ? undefined : r.error,
      resultSummary: { voiceTaskId: taskId, fanId, gatekeeper_output: text.slice(0, 80) },
    })
    return
  }

  if (job.feature === 'churn_run') {
    const candidateIds = Array.isArray(meta.candidateIds)
      ? (meta.candidateIds as unknown[])
          .map((x) => String(x ?? '').trim())
          .filter((x): x is string => /^[0-9a-f-]{36}$/i.test(x))
      : []
    const creditsNeeded = Math.floor(Number(meta.creditsNeeded ?? 2)) || 2
    const ts =
      typeof meta.ts_iso === 'string' ? meta.ts_iso : new Date().toISOString()
    const { data: fans } = candidateIds.length
      ? await supabase
          .from('fans')
          .select('id,platform,platform_fan_id')
          .eq('user_id', job.user_id)
          .in('id', candidateIds)
      : { data: [] as { id: string; platform: string; platform_fan_id: string | null }[] }
    const { data: churnRow } = await supabase
      .from('circe_churn_settings')
      .select('*')
      .eq('user_id', job.user_id)
      .maybeSingle()
    if (!churnRow) {
      await finalizeJobBasics({
        supabase,
        job,
        responsePayload,
        success: false,
        error: 'circe_churn_settings_missing',
      })
      return
    }
    const digest = text.trim()
    if (!digest) {
      await finalizeJobBasics({
        supabase,
        job,
        responsePayload,
        success: false,
        error: 'empty_digest',
      })
      return
    }
    const persisted = await persistCirceChurnMarkdownDigest(supabase, {
      userId: job.user_id,
      settings: churnRow as unknown as CirceChurnSettingsRow,
      digest,
      candidates: (fans ?? []) as { id: string; platform: string; platform_fan_id: string | null }[],
      creditsNeeded,
      tsISO: ts,
    })
    await finalizeJobBasics({
      supabase,
      job,
      responsePayload,
      success: persisted.ok,
      error: persisted.ok ? undefined : persisted.error,
      resultSummary: { fans: candidateIds.length, excerpt: digest.slice(0, 200) },
    })
    return
  }

  if (job.feature === 'mimic_test') {
    const drafted = text.trim()
    const preferReviewDraft = meta.mimic_never_review !== false
    const note = preferReviewDraft
      ? 'Draft only—review before sending. Fan-facing AI drafts require your approval.'
      : 'Review recommended before sending.'
    await finalizeJobBasics({
      supabase,
      job,
      responsePayload,
      success: Boolean(drafted),
      error: drafted ? undefined : 'empty_model_output',
      resultSummary: {
        draft: drafted.slice(0, 6000),
        note,
        fanId: typeof meta.fanId === 'string' ? meta.fanId : undefined,
      },
    })
    return
  }

  if (job.feature === 'ai_chatter') {
    const inboundMessageId = String(meta.inboundMessageId ?? '')
    const platformFanId = String(meta.platformFanId ?? '')
    const automationId = String(meta.automationId ?? '')
    const repliesToday = Math.floor(Number(meta.repliesToday ?? 0)) || 0
    const day = typeof meta.day === 'string' && meta.day.trim() ? meta.day : utcDayString()
    const isWhaleWhisper = meta.isWhaleWhisper === true
    const fanUsername = typeof meta.fan_username === 'string' ? meta.fan_username : null
    const betaAt = typeof meta.beta_acknowledged_at === 'string' ? meta.beta_acknowledged_at : null

    if (!inboundMessageId || !platformFanId || !automationId) {
      await finalizeJobBasics({
        supabase,
        job,
        responsePayload,
        success: false,
        error: 'missing_ai_chatter_metadata',
      })
      return
    }

    const { parseAiChatterSettings } = await import('@/lib/divine/ai-chatter-types')
    const { parseMimicProfile, DEFAULT_MIMIC_PROFILE } = await import('@/lib/divine/mimic-types')
    const { finalizeAiChatterAfterCompose } = await import('@/lib/divine/ai-chatter-complete')

    const settings = parseAiChatterSettings(meta.settings)
    const mimic =
      meta.mimic != null ? parseMimicProfile(meta.mimic) ?? { ...DEFAULT_MIMIC_PROFILE } : { ...DEFAULT_MIMIC_PROFILE }

    const composedText = text.trim()
    if (!composedText) {
      await finalizeJobBasics({
        supabase,
        job,
        responsePayload,
        success: false,
        error: 'empty_compose_output',
      })
      return
    }

    const done = await finalizeAiChatterAfterCompose({
      supabase,
      userId: job.user_id,
      platformFanId,
      inboundMessageId,
      row: {
        id: automationId,
        fan_username: fanUsername,
        beta_acknowledged_at: betaAt,
      },
      mimic,
      settings,
      composedText,
      repliesToday,
      day,
      isWhaleWhisper,
    })

    await finalizeJobBasics({
      supabase,
      job,
      responsePayload,
      success: done.ok,
      error: done.ok ? undefined : done.error,
      resultSummary: {
        inboundMessageId,
        platformFanId,
        action: done.ok ? ('action' in done ? done.action : 'unknown') : 'error',
      },
    })
    return
  }

  if (job.feature === 'mass_dm_composer') {
    const billingCost = Math.floor(Number(meta.billing_credit_cost ?? 0))
    const billingToolId =
      typeof meta.billing_tool_id === 'string' && meta.billing_tool_id.trim()
        ? meta.billing_tool_id.trim()
        : 'mass-dm-composer'
    const digest = text.trim()
    let billingOk = true
    if (digest && billingCost > 0) {
      const { consumeAiCredits } = await import('@/lib/billing/consume-ai-credits')
      const { ledgerDebitOptsForBillingTool } = await import('@/lib/billing/credit-reason-label')
      const charged = await consumeAiCredits(supabase, job.user_id, billingCost, {
        ...ledgerDebitOptsForBillingTool(billingToolId),
      })
      billingOk = charged.ok
    }
    await finalizeJobBasics({
      supabase,
      job,
      responsePayload,
      success: Boolean(digest) && billingOk,
      error: digest
        ? billingOk
          ? undefined
          : 'ai_credits_charge_failed'
        : 'empty_model_output',
      resultSummary: digest ? { composer_markdown: digest.slice(0, 120_000) } : null,
    })
    return
  }

  if (job.feature === 'briefing_script') {
    await finalizeJobBasics({
      supabase,
      job,
      responsePayload,
      success: Boolean(text.trim()),
      error: text.trim() ? undefined : 'empty_model_output',
      resultSummary: { script: text.slice(0, 50_000), mode: meta.mode },
    })
    return
  }

  await finalizeJobBasics({
    supabase,
    job,
    responsePayload,
    success: true,
    resultSummary: { fallback: text.slice(0, 2000) },
  })
}

export async function processParsedOpenAiWebhook(args: {
  event: Record<string, unknown>
  rawBody: string
  headers: Headers
}): Promise<void> {
  const webhookId =
    args.headers.get('webhook-id') ??
    args.headers.get('Webhook-Id') ??
    args.headers.get('webhook_id') ??
    ''

  const payloadHash = crypto.createHash('sha256').update(args.rawBody).digest('hex')
  const supabase = createServiceRoleClient()
  const resv = await reserveWebhookEventLedger(supabase, {
    webhookId: webhookId || payloadHash.slice(0, 32),
    eventType: String(args.event?.type ?? 'unknown'),
    payloadHash,
  })
  if (resv.duplicate) return

  const type = String(args.event?.type ?? '')
  const data = args.event?.data as { id?: string } | undefined
  const responseId = typeof data?.id === 'string' ? data.id.trim() : ''
  if (!responseId) return

  const { data: job } = await supabase
    .from('openai_jobs')
    .select('*')
    .eq('response_id', responseId)
    .maybeSingle()

  if (!job) {
    console.warn('[openai webhook] no job for response_id', responseId.slice(0, 12))
    return
  }

  const jobTyped = job as unknown as OpenaiJobRow & { response_id?: string | null }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return
  const client = new OpenAI({ apiKey })
  try {
    if (type === 'response.completed' || type.endsWith('response.completed')) {
      const full = await client.responses.retrieve(responseId)
      const payload = JSON.parse(JSON.stringify(full)) as Record<string, unknown>
      await handleFeatureCompleted(supabase, jobTyped, payload)
      return
    }
    if (
      type.includes('failed') ||
      type.includes('cancelled') ||
      type.includes('incomplete')
    ) {
      await finalizeJobBasics({
        supabase,
        job: jobTyped,
        responsePayload: { id: responseId },
        success: false,
        error: `event:${type}`,
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'processing_failed'
    await finalizeJobBasics({
      supabase,
      job: jobTyped,
      responsePayload: { id: responseId },
      success: false,
      error: msg,
    })
  }
}
