import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { computeGlowInsightsForUser } from '@/lib/wellbeing/compute-glow-insights'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await computeGlowInsightsForUser(supabase, user)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[wellbeing/glow-insights]', error)
    return NextResponse.json({ error: 'Failed to load glow insights' }, { status: 500 })
  }
}
