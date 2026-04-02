import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { executePhotoEditIntent } from '@/lib/media/photo-edit-intent-core'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = (await req.json().catch(() => null)) as {
    imageBase64?: string
    instruction?: string
  }
  const imageBase64 = typeof json.imageBase64 === 'string' ? json.imageBase64 : ''
  const instruction = typeof json.instruction === 'string' ? json.instruction : ''

  const result = await executePhotoEditIntent({
    imageBase64,
    instruction,
    userId: user.id,
    supabase,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result.data)
}
