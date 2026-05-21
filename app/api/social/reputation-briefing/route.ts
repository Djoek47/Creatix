import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'
import { runReputationBriefingCore } from '@/lib/reputation/briefing-server'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { handles?: string[] }
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await runReputationBriefingCore(supabase, user.id, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    briefing: result.briefing,
    onboarding: result.onboarding,
    message: result.message,
    storedAt: result.storedAt,
  } as {
    success: boolean
    briefing: ReputationBriefingPayload
    onboarding: boolean
    message?: string
    storedAt: string
  })
}
