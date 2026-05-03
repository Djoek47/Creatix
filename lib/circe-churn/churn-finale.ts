/**
 * Persist Churn Predictor markdown digest (shared by sync Claude path + OpenAI webhook path).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDivineAppNotification } from '@/lib/notifications/divine-app-notification'
import {
  extractChurnFanSignalsFromDigest,
  normalizeRiskLevel,
} from '@/lib/circe-churn/parse-digest-json'
import type { CirceChurnSettingsRow } from '@/lib/circe-churn/circe-churn-types'

export type ChurnFanCandidatePersist = {
  id: string
  platform: string
  platform_fan_id: string | null
}

export async function persistCirceChurnMarkdownDigest(
  supabase: SupabaseClient,
  args: {
    userId: string
    settings: CirceChurnSettingsRow
    digest: string
    candidates: ChurnFanCandidatePersist[]
    creditsNeeded: number
    tsISO: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, settings, digest, candidates, creditsNeeded, tsISO: ts } = args
  const excerpt = digest.slice(0, 500)

  const { consumeAiCredits } = await import('@/lib/billing/consume-ai-credits')

  const consumed = await consumeAiCredits(supabase, userId, creditsNeeded, {
    reasonCode: 'retention_churn_digest',
    metadata: { service_display_name: 'Retention digest (Churn)' },
  })
  if (!consumed.ok) {
    await supabase
      .from('circe_churn_settings')
      .update({
        last_run_at: ts,
        last_run_error: 'Insufficient AI credits',
        updated_at: ts,
      })
      .eq('user_id', userId)
    return { ok: false, error: 'Insufficient AI credits' }
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

  return { ok: true }
}
