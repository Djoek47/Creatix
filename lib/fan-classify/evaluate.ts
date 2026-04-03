import type { FanClassifySegmentRule } from '@/lib/divine-manager'

const EPS = 0.009

export type ClassifyFanRow = {
  id: string
  platform: string
  platform_fan_id: string | null
  total_spent: number | null
  subscription_price: number | null
  subscription_status: string | null
  subscription_account_type: string | null
  first_subscribed_at: string | null
  subscription_start: string | null
  created_at: string | null
  last_interaction_at: string | null
  spend_tips: number | null
  spend_messages: number | null
  spend_posts: number | null
  spend_subscriptions: number | null
}

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function extraSpend(row: ClassifyFanRow): { sum: number; known: boolean } {
  const tips = row.spend_tips
  const msg = row.spend_messages
  const posts = row.spend_posts
  const hasAny = [tips, msg, posts].some((x) => x != null)
  if (!hasAny) return { sum: 0, known: false }
  return {
    sum: num(tips) + num(msg) + num(posts),
    known: true,
  }
}

function subStartMs(row: ClassifyFanRow): number | null {
  const s = row.first_subscribed_at || row.subscription_start || row.created_at
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : null
}

/** Days since first subscription / CRM created_at. */
export function classifyTenureDays(row: ClassifyFanRow, nowMs: number = Date.now()): number {
  const t = subStartMs(row)
  if (t == null) return 0
  return Math.floor((nowMs - t) / 86400000)
}

function daysSinceSubStart(row: ClassifyFanRow, nowMs: number): number | null {
  const t = subStartMs(row)
  if (t == null) return null
  return Math.floor((nowMs - t) / 86400000)
}

function isSubscriptionActive(row: ClassifyFanRow): boolean {
  const s = (row.subscription_status || '').toLowerCase()
  return s === 'active' || s === 'pending' || s === ''
}

function lastInteractionMs(row: ClassifyFanRow): number | null {
  const s = row.last_interaction_at
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : null
}

function isActiveWithinDays(row: ClassifyFanRow, days: number, nowMs: number): boolean {
  const t = lastInteractionMs(row)
  if (t == null) return false
  return nowMs - t <= days * 86400000
}

export function fanMatchesClassifySegment(
  row: ClassifyFanRow,
  rule: FanClassifySegmentRule,
  nowMs: number = Date.now(),
): boolean {
  const total = num(row.total_spent)
  const extra = extraSpend(row)
  const tenureSplit = rule.freeloader_tenure_days ?? 45
  const recentDays = rule.recent_sub_days ?? 3
  const subPrice = num(row.subscription_price)

  const isFreeloaderSpend = (): boolean => {
    if (extra.known) return total <= EPS && extra.sum <= EPS
    return total <= EPS
  }

  const isSpender = (): boolean => {
    if (extra.known) return extra.sum > EPS
    return total > EPS
  }

  const isSubscriberNoExtra = (): boolean => {
    if (!isSubscriptionActive(row)) return false
    if (!(subPrice > EPS)) return false
    if (extra.known) return extra.sum <= EPS
    const subPart = num(row.spend_subscriptions)
    if (subPart > EPS) return total - subPart <= EPS
    return total <= subPrice + EPS
  }

  switch (rule.segment) {
    case 'freeloader_new':
      return isFreeloaderSpend() && classifyTenureDays(row, nowMs) < tenureSplit
    case 'freeloader_mature':
      return isFreeloaderSpend() && classifyTenureDays(row, nowMs) >= tenureSplit
    case 'spenders':
      return isSpender()
    case 'subscriber_no_extra':
      return isSubscriberNoExtra()
    case 'recent_sub_3d': {
      const d = daysSinceSubStart(row, nowMs)
      return d != null && d <= recentDays
    }
    case 'whale_spend': {
      const min = rule.spendMin ?? 500
      return total >= min
    }
    case 'active_chatter': {
      const days = rule.chatDays ?? 7
      return isActiveWithinDays(row, days, nowMs)
    }
    case 'cold': {
      const coldMax = rule.coldSpendMax ?? 50
      const activeDays = rule.chatDays ?? 14
      return total <= coldMax && !isActiveWithinDays(row, activeDays, nowMs)
    }
    default:
      return false
  }
}
