/** Maps OnlyFans webhook / transaction type strings to increment_fan_spending_categorized buckets. */

export type SpendBucket = 'subscription' | 'tip' | 'message' | 'post' | 'other'

export function spendBucketFromUserSpentType(raw: string | undefined | null): SpendBucket {
  const t = (raw ?? '').toLowerCase().trim()
  if (!t) return 'other'
  if (t.includes('subscription') || t.includes('renew')) return 'subscription'
  if (t.includes('tip')) return 'tip'
  if (t.includes('message') || t.includes('chat')) return 'message'
  if (t.includes('post') || t.includes('ppv') || t.includes('stream')) return 'post'
  return 'other'
}

export function spendBucketFromTransactionType(raw: string | undefined | null): SpendBucket {
  const t = (raw ?? '').toLowerCase().trim()
  if (t === 'subscription') return 'subscription'
  if (t === 'tip') return 'tip'
  if (t === 'message') return 'message'
  if (t === 'post') return 'post'
  return spendBucketFromUserSpentType(t)
}
