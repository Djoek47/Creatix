import type { SupabaseClient } from '@supabase/supabase-js'
import { getFanRecentById } from '@/lib/divine/fan-recents-server'
import { detectCreatorLikelyFromText, type CreatorDetectorSignal } from '@/lib/divine/creator-detector'
import type { DivineManagerAutomationRules } from '@/lib/divine-manager'
import { policySkipExpensiveAiForCreatorLikely } from '@/lib/divine/creator-resource-policy'

export type UnifiedFanProfilePayload = {
  fanId: string
  platform: string
  creatorClassification: string | null
  /** From `fans` row when synced; used for whale/VIP badges. */
  crm: {
    totalSpent: number
    subscriptionTier: string | null
    /** free | paid | unknown — from list subscription price when synced. */
    subscriptionAccountType: string | null
    subscriptionPrice: number | null
    subscriptionStatus: string | null
  } | null
  core: {
    username: string | null
    displayName: string | null
    avatarUrl: string | null
    lastSeenAt: string | null
  } | null
  threadInsight: {
    updatedAt: string | null
    iteration: number | null
    profileJson: unknown
    threadSnapshotExcerpt: string | null
    lastThreadRefreshAt: string | null
    lastScanAt: string | null
    lastUpdateAt: string | null
    lastScanKind: string | null
    insufficientData: boolean
    insufficientDataReason: string | null
  } | null
  aiSummary: {
    summaryJson: unknown
    status: string | null
    lastAnalyzedAt: string | null
    updatedAt: string | null
  } | null
  creatorDetector: CreatorDetectorSignal
  /** From OnlyFans fan detail API when refreshed. */
  platformAbout: string | null
  platformAboutFetchedAt: string | null
  /** Per-fan: still run AI Chatter / Commenter when heuristics say “likely creator”. */
  treatAsFanForAutomation: boolean
  /** Global Divine setting: skip expensive AI for likely creators (default on). */
  skipExpensiveAiForCreatorLikely: boolean
}

export async function buildUnifiedFanProfile(
  supabase: SupabaseClient,
  userId: string,
  fanId: string,
  platform: string = 'onlyfans',
): Promise<UnifiedFanProfilePayload> {
  const row = await getFanRecentById(supabase, userId, fanId, platform)
  const core = row
    ? {
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        lastSeenAt: row.last_seen_at,
      }
    : null

  const [{ data: ins }, { data: sum }, { data: fanCrm }, { data: dmRow }] = await Promise.all([
    supabase
      .from('fan_thread_insights')
      .select(
        'thread_snapshot_text, profile_json, updated_at, iteration, last_thread_refresh_at, last_scan_at, last_update_at, last_scan_kind, insufficient_data, insufficient_data_reason',
      )
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('platform_fan_id', fanId)
      .maybeSingle(),
    platform === 'onlyfans'
      ? supabase
          .from('fan_ai_summaries')
          .select('summary_json, status, last_analyzed_at, updated_at')
          .eq('user_id', userId)
          .eq('platform_fan_id', fanId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('fans')
      .select(
        'creator_classification, total_spent, subscription_tier, subscription_account_type, subscription_price, subscription_status, platform_about, platform_about_fetched_at, treat_as_fan_for_automation',
      )
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('platform_fan_id', fanId)
      .maybeSingle(),
    supabase.from('divine_manager_settings').select('automation_rules').eq('user_id', userId).maybeSingle(),
  ])

  const insRow = ins as {
    thread_snapshot_text?: string | null
    profile_json?: unknown
    updated_at?: string | null
    iteration?: number | null
    last_thread_refresh_at?: string | null
    last_scan_at?: string | null
    last_update_at?: string | null
    last_scan_kind?: string | null
    insufficient_data?: boolean | null
    insufficient_data_reason?: string | null
  } | null

  const sumRow = sum as {
    summary_json?: unknown
    status?: string | null
    last_analyzed_at?: string | null
    updated_at?: string | null
  } | null

  const threadInsight = insRow
    ? {
        updatedAt: insRow.updated_at ?? null,
        iteration: insRow.iteration ?? null,
        profileJson: insRow.profile_json ?? null,
        threadSnapshotExcerpt: insRow.thread_snapshot_text
          ? String(insRow.thread_snapshot_text).slice(0, 1200)
          : null,
        lastThreadRefreshAt: insRow.last_thread_refresh_at ?? null,
        lastScanAt: insRow.last_scan_at ?? null,
        lastUpdateAt: insRow.last_update_at ?? null,
        lastScanKind: insRow.last_scan_kind ?? null,
        insufficientData: insRow.insufficient_data === true,
        insufficientDataReason: insRow.insufficient_data_reason ?? null,
      }
    : null

  const aiSummary = sumRow
    ? {
        summaryJson: sumRow.summary_json ?? null,
        status: sumRow.status ?? null,
        lastAnalyzedAt: sumRow.last_analyzed_at ?? null,
        updatedAt: sumRow.updated_at ?? null,
      }
    : null

  const platformAbout =
    typeof (fanCrm as { platform_about?: string | null } | null)?.platform_about === 'string'
      ? (fanCrm as { platform_about: string }).platform_about.trim().slice(0, 8000) || null
      : null
  const platformAboutFetchedAt =
    typeof (fanCrm as { platform_about_fetched_at?: string | null } | null)?.platform_about_fetched_at ===
    'string'
      ? (fanCrm as { platform_about_fetched_at: string }).platform_about_fetched_at
      : null
  const treatAsFanForAutomation =
    (fanCrm as { treat_as_fan_for_automation?: boolean | null } | null)?.treat_as_fan_for_automation === true

  const rules = (dmRow as { automation_rules?: DivineManagerAutomationRules } | null)?.automation_rules
  const skipExpensiveAiForCreatorLikely = policySkipExpensiveAiForCreatorLikely(rules?.alerts)

  const hay = [
    platformAbout,
    core?.username,
    core?.displayName,
    insRow?.thread_snapshot_text,
    insRow?.profile_json != null ? JSON.stringify(insRow.profile_json) : '',
    sumRow?.summary_json != null ? JSON.stringify(sumRow.summary_json) : '',
  ]
    .filter(Boolean)
    .join('\n')

  const storedCreatorSignal =
    insRow?.profile_json && typeof insRow.profile_json === 'object'
      ? ((insRow.profile_json as Record<string, unknown>).creator_detector as CreatorDetectorSignal | undefined)
      : undefined
  const creatorDetector = storedCreatorSignal ?? detectCreatorLikelyFromText(hay)

  const fanRow = fanCrm as {
    creator_classification?: string | null
    total_spent?: string | number | null
    subscription_tier?: string | null
    subscription_account_type?: string | null
    subscription_price?: string | number | null
    subscription_status?: string | null
  } | null
  const ccRaw = fanRow?.creator_classification
  const creatorClassification =
    typeof ccRaw === 'string' && ccRaw.trim() ? ccRaw.trim().slice(0, 2000) : null

  const crm =
    fanRow != null
      ? {
          totalSpent: Number(fanRow.total_spent) || 0,
          subscriptionTier:
            typeof fanRow.subscription_tier === 'string' && fanRow.subscription_tier.trim()
              ? fanRow.subscription_tier.trim()
              : null,
          subscriptionAccountType:
            typeof fanRow.subscription_account_type === 'string' && fanRow.subscription_account_type.trim()
              ? fanRow.subscription_account_type.trim()
              : null,
          subscriptionPrice:
            fanRow.subscription_price != null && !Number.isNaN(Number(fanRow.subscription_price))
              ? Number(fanRow.subscription_price)
              : null,
          subscriptionStatus:
            typeof fanRow.subscription_status === 'string' && fanRow.subscription_status.trim()
              ? fanRow.subscription_status.trim()
              : null,
        }
      : null

  return {
    fanId,
    platform,
    creatorClassification,
    crm,
    core,
    threadInsight,
    aiSummary,
    creatorDetector,
    platformAbout,
    platformAboutFetchedAt,
    treatAsFanForAutomation,
    skipExpensiveAiForCreatorLikely,
  }
}
