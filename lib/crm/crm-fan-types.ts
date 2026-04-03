import type { Fan } from '@/lib/types'

/** Fan row for CRM tools: DB merge + optional live OF/Fansly with extra classification fields from DB. */
export type CrmFanListItem = Fan & {
  creator_classification?: string | null
  subscription_tier_raw?: string | null
  subscription_status_raw?: string | null
  _source?: 'database' | 'live_onlyfans' | 'live_fansly'
}

export type CrmFansResponse = {
  fans: CrmFanListItem[]
  meta: {
    mode: string
    databaseCount: number
    mergedTotal: number
    liveOnlyFansAdded: number
    liveFanslyAdded: number
    onlyFansConnected: boolean
    fanslyConnected: boolean
    warnings: string[]
  }
}
