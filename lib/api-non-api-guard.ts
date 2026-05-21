import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { resolveWorkspaceCapabilities, type SubscriptionCapsRow } from '@/lib/plan-capabilities'

const SUBSCRIPTION_SELECT = 'plan_id,status,protection_plan_active'

export function nonApiPlanJsonResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'This action requires a full Creatix plan with API-connected features.',
      code: 'PLAN_NON_API',
    },
    { status: 403 },
  )
}

export async function loadSubscriptionCapsRow(
  request: NextRequest,
): Promise<{ userId: string; row: SubscriptionCapsRow } | null> {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: row } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_SELECT)
    .eq('user_id', user.id)
    .maybeSingle()
  return { userId: user.id, row: row as SubscriptionCapsRow }
}

/** Call after confirming the user is authenticated. Returns 403 when non-API tier blocks API actions. */
export async function denyIfNonApiProtectionTier(request: NextRequest): Promise<NextResponse | null> {
  const loaded = await loadSubscriptionCapsRow(request)
  if (!loaded) return null
  const caps = resolveWorkspaceCapabilities(loaded.row)
  if (caps.isNonApiProtectionTier) return nonApiPlanJsonResponse()
  return null
}
