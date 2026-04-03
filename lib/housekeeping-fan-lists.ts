import type { SupabaseClient } from '@supabase/supabase-js'
import type { FanClassifyConfig } from '@/lib/divine-manager'
import { syncFanClassifyForUser } from '@/lib/fan-classify/sync-core'

/** @deprecated use syncFanClassifyForUser */
export async function syncHousekeepingListsForUser(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  config: FanClassifyConfig,
): Promise<{ ok: boolean; error?: string; details: string[] }> {
  return syncFanClassifyForUser(supabase, userId, config, { onlyfansAccessToken: accessToken })
}

export { syncFanClassifyForUser } from '@/lib/fan-classify/sync-core'
