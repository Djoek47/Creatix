import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'

/**
 * GET — OnlyFans user lists for Smart classify list picker (session auth).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'OnlyFans is not connected' }, { status: 400 })
    }

    const api = createOnlyFansAPI()
    api.setAccountId(connection.access_token as string)
    const raw = await api.listUserLists({ limit: 100, offset: 0 })

    const lists: { id: string; name: string }[] = []
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>
      const arr = o.data ?? o.lists ?? o.items ?? raw
      if (Array.isArray(arr)) {
        for (const row of arr) {
          if (!row || typeof row !== 'object') continue
          const r = row as Record<string, unknown>
          const id = r.id ?? r.userListId
          if (id == null) continue
          lists.push({
            id: String(id),
            name: r.name != null ? String(r.name) : String(id),
          })
        }
      }
    }

    return NextResponse.json({ lists })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
