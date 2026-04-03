import {
  buildAudienceBadges,
  isWhaleOrVipAudience,
  type AudienceBadge,
} from '@/lib/fans/audience-classification'
import { detectCreatorLikelyFromText } from '@/lib/divine/creator-detector'
import type { SupabaseClient } from '@supabase/supabase-js'

export type InboxSegment = 'all' | 'unread' | 'whales' | 'creators' | 'fans'
export type InboxSort = 'recent' | 'spend' | 'unread'
export type InboxPlatformFilter = 'all' | 'onlyfans' | 'fansly'

export type InboxCrmPayload = {
  totalSpent: number
  tier: string
  tags: string[]
  creatorClassification: string | null
  subscriptionStart: string | null
  /** Days since first subscription (or fan row created_at fallback). */
  fanTenureDays: number | null
  audienceBadges: Array<Pick<AudienceBadge, 'key' | 'label' | 'className'>>
  creatorLikely: boolean
  /** When true, user forced “treat as fan” — hide from creator segment. */
  treatAsFanForAutomation: boolean
  /** From background Churn Predictor (latest snapshot per platform fan id). */
  churnRisk?: 'low' | 'medium' | 'high' | 'critical' | 'unknown' | null
  churnOneLine?: string | null
}

const CHUNK = 120

function daysBetween(iso: string | null, fallbackIso: string | null): number | null {
  const a = iso || fallbackIso
  if (!a) return null
  const t = new Date(a).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)))
}

export function isCreatorSegment(crm: InboxCrmPayload | undefined): boolean {
  if (!crm) return false
  if (crm.treatAsFanForAutomation) return false
  if (crm.creatorLikely) return true
  return Boolean(crm.creatorClassification?.trim())
}

export function isWhaleSegment(crm: InboxCrmPayload | undefined): boolean {
  if (!crm) return false
  return isWhaleOrVipAudience(crm.totalSpent, crm.tier)
}

export function isFansLaneSegment(crm: InboxCrmPayload | undefined): boolean {
  if (!crm) return true
  return !isWhaleSegment(crm) && !isCreatorSegment(crm)
}

export function matchesInboxSegment(
  segment: InboxSegment,
  unreadCount: number,
  crm: InboxCrmPayload | undefined,
): boolean {
  if (segment === 'all') return true
  if (segment === 'unread') return unreadCount > 0
  if (segment === 'whales') return isWhaleSegment(crm)
  if (segment === 'creators') return isCreatorSegment(crm)
  if (segment === 'fans') return isFansLaneSegment(crm)
  return true
}

export function matchesTagFilter(tag: string | undefined, crm: InboxCrmPayload | undefined): boolean {
  if (!tag?.trim()) return true
  const t = tag.trim().toLowerCase()
  if (!crm) return false
  if (crm.tags.some((x) => x.toLowerCase().includes(t))) return true
  if (crm.creatorClassification?.toLowerCase().includes(t)) return true
  return false
}

export function matchesSearchQuery(
  q: string | undefined,
  username: string,
  name: string,
): boolean {
  if (!q?.trim()) return true
  const s = q.trim().toLowerCase()
  return (
    username.toLowerCase().includes(s) ||
    (name || '').toLowerCase().includes(s)
  )
}

type FanRow = {
  platform_fan_id: string | null
  platform: string
  total_spent: number | string | null
  subscription_tier: string | null
  tags: string[] | null
  creator_classification: string | null
  first_subscribed_at: string | null
  subscription_start: string | null
  created_at: string | null
  platform_about: string | null
  treat_as_fan_for_automation: boolean | null
}

function rowToCrm(row: FanRow): InboxCrmPayload {
  const totalSpent = Number(row.total_spent) || 0
  const tier = String(row.subscription_tier || 'regular')
  const about = (row.platform_about || '').trim()
  const treatAsFan = row.treat_as_fan_for_automation === true
  const detector = detectCreatorLikelyFromText(
    `${about} ${row.creator_classification || ''}`.trim(),
  )
  const creatorLikelyHeuristic = treatAsFan ? false : detector.is_creator_likely

  const subscriptionStart = row.first_subscribed_at || row.subscription_start || null
  const fanTenureDays = daysBetween(subscriptionStart, row.created_at || null)

  const badges = buildAudienceBadges({
    totalSpent,
    tier,
    creatorLikely: creatorLikelyHeuristic,
  })

  return {
    totalSpent,
    tier,
    tags: Array.isArray(row.tags) ? row.tags : [],
    creatorClassification: row.creator_classification,
    subscriptionStart,
    fanTenureDays,
    audienceBadges: badges.map((b) => ({ key: b.key, label: b.label, className: b.className })),
    creatorLikely: creatorLikelyHeuristic,
    treatAsFanForAutomation: treatAsFan,
    churnRisk: null,
    churnOneLine: null,
  }
}

/**
 * Batch-load CRM rows for platform fan ids (chunked IN queries).
 */
export async function fetchCrmMapForFanIds(
  supabase: SupabaseClient,
  userId: string,
  platform: 'onlyfans' | 'fansly',
  fanIds: string[],
): Promise<Map<string, InboxCrmPayload>> {
  const out = new Map<string, InboxCrmPayload>()
  const ids = [...new Set(fanIds.map((x) => String(x).trim()).filter(Boolean))]
  if (ids.length === 0) return out

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('fans')
      .select(
        'platform_fan_id, platform, total_spent, subscription_tier, tags, creator_classification, first_subscribed_at, subscription_start, created_at, platform_about, treat_as_fan_for_automation',
      )
      .eq('user_id', userId)
      .eq('platform', platform)
      .in('platform_fan_id', slice)

    if (error) {
      console.warn('[inbox-crm]', error.message)
      continue
    }
    for (const raw of data ?? []) {
      const row = raw as FanRow
      const id = row.platform_fan_id ? String(row.platform_fan_id) : ''
      if (!id) continue
      out.set(id, rowToCrm(row))
    }
  }
  return out
}

type ChurnSnap = {
  platform_fan_id: string
  risk_level: string | null
  one_line: string | null
}

/**
 * Batch-load latest churn snapshot lines keyed by platform fan id.
 */
export async function fetchChurnSnapshotMapForFanIds(
  supabase: SupabaseClient,
  userId: string,
  platform: 'onlyfans' | 'fansly',
  fanIds: string[],
): Promise<Map<string, Pick<InboxCrmPayload, 'churnRisk' | 'churnOneLine'>>> {
  const out = new Map<string, Pick<InboxCrmPayload, 'churnRisk' | 'churnOneLine'>>()
  const ids = [...new Set(fanIds.map((x) => String(x).trim()).filter(Boolean))]
  if (ids.length === 0) return out

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('fan_churn_snapshots')
      .select('platform_fan_id, risk_level, one_line')
      .eq('user_id', userId)
      .eq('platform', platform)
      .in('platform_fan_id', slice)

    if (error) {
      console.warn('[inbox-churn]', error.message)
      continue
    }
    for (const raw of data ?? []) {
      const row = raw as ChurnSnap
      const id = row.platform_fan_id ? String(row.platform_fan_id) : ''
      if (!id) continue
      const r = (row.risk_level || 'unknown').toLowerCase()
      const risk =
        r === 'critical' || r === 'high' || r === 'medium' || r === 'low' || r === 'unknown'
          ? (r as InboxCrmPayload['churnRisk'])
          : 'unknown'
      out.set(id, {
        churnRisk: risk,
        churnOneLine: row.one_line?.trim() || null,
      })
    }
  }
  return out
}

export function sortEnrichedInbox<
  T extends {
    lastMessage?: { createdAt?: string }
    unreadCount?: number
    crm?: InboxCrmPayload | null
  },
>(items: T[], sort: InboxSort): T[] {
  const copy = [...items]
  if (sort === 'spend') {
    copy.sort((a, b) => {
      const sa = a.crm?.totalSpent ?? -1
      const sb = b.crm?.totalSpent ?? -1
      if (sb !== sa) return sb - sa
      const da = new Date(a.lastMessage?.createdAt || 0).getTime()
      const db = new Date(b.lastMessage?.createdAt || 0).getTime()
      return db - da
    })
    return copy
  }
  if (sort === 'unread') {
    copy.sort((a, b) => {
      const ua = a.unreadCount ?? 0
      const ub = b.unreadCount ?? 0
      if (ub !== ua) return ub - ua
      const da = new Date(a.lastMessage?.createdAt || 0).getTime()
      const db = new Date(b.lastMessage?.createdAt || 0).getTime()
      return db - da
    })
    return copy
  }
  copy.sort((a, b) => {
    const da = new Date(a.lastMessage?.createdAt || 0).getTime()
    const db = new Date(b.lastMessage?.createdAt || 0).getTime()
    return db - da
  })
  return copy
}
