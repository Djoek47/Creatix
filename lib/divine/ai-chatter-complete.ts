/**
 * Completes outbound path after Mimic/OpenAI compose (outbox queue or immediate send).
 * Shared with OpenAI Responses webhook completion for AI Chatter.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { executeSendMessage } from '@/lib/divine-intent-actions'
import type { MimicProfileV1 } from '@/lib/divine/mimic-types'
import type { AiChatterSettings } from '@/lib/divine/ai-chatter-types'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import { consumeAiCredits } from '@/lib/billing/consume-ai-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { ledgerDebitOptsForBillingTool } from '@/lib/billing/credit-reason-label'

type AutomationRowSubset = {
  id: string
  fan_username: string | null
  beta_acknowledged_at: string | null
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

/** Mirror worker credit bump naming. */
async function bumpAiCredits(supabase: SupabaseClient, userId: string): Promise<void> {
  await consumeAiCredits(supabase, userId, getCreditsForToolId('ai-chatter'), ledgerDebitOptsForBillingTool('ai-chatter'))
}

export async function finalizeAiChatterAfterCompose(opts: {
  supabase: SupabaseClient
  userId: string
  platformFanId: string
  inboundMessageId: string
  row: AutomationRowSubset
  mimic: MimicProfileV1
  settings: AiChatterSettings
  composedText: string
  repliesToday: number
  day: string
  isWhaleWhisper: boolean
}): Promise<
  | { ok: true; action: 'draft_queued'; outboxId?: string }
  | { ok: true; action: 'sent' }
  | { ok: false; error: string }
> {
  const {
    supabase,
    userId,
    platformFanId,
    inboundMessageId,
    row,
    mimic,
    settings,
    composedText,
    repliesToday,
    day,
    isWhaleWhisper,
  } = opts

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
        draft_text: composedText,
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
      via: 'openai_response_webhook',
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
    message: composedText,
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
  await logEvent(supabase, row.id, userId, 'sent', {
    inbound_message_id: inboundMessageId,
    via: 'openai_response_webhook',
  })
  return { ok: true, action: 'sent' }
}
