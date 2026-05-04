import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createFanslyAPI } from '@/lib/fansly-api'
import { fanslyBillingGateResponse } from '@/lib/onlyfans-api-route'
import { resolveFanslyChat } from '@/lib/fansly/resolve-fansly-chat'

export type FanslyMessagingRouteContext = {
  api: ReturnType<typeof createFanslyAPI>
  accountId: string
}

/**
 * Authenticated Fansly partner API for messaging routes (billing gate + connected account).
 */
export async function requireFanslyMessagingApi(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; ctx: FanslyMessagingRouteContext } | { ok: false; response: NextResponse }> {
  const billingBlock = await fanslyBillingGateResponse(supabase)
  if (billingBlock) return { ok: false, response: billingBlock }

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token')
    .eq('user_id', userId)
    .eq('platform', 'fansly')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return { ok: false, response: NextResponse.json({ error: 'Fansly not connected' }, { status: 400 }) }
  }

  const accountId = String(connection.access_token)
  const api = createFanslyAPI(accountId)
  return { ok: true, ctx: { api, accountId } }
}

/** Path param may be Fansly `groupId` (chat id) or the fan’s user id — same as `/api/fansly/messages/[fanId]`. */
export async function fanslyRouteResolveChatId(
  api: ReturnType<typeof createFanslyAPI>,
  encodedParam: string,
): Promise<{ chatId: string } | NextResponse> {
  const param = decodeURIComponent(encodedParam.trim())
  const resolved = await resolveFanslyChat(api, param)
  if (!resolved) {
    return NextResponse.json({ error: 'Chat not found for this Fansly account.' }, { status: 404 })
  }
  return { chatId: resolved.chatId }
}
