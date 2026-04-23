import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { enqueueAriadneEmbedV2Job } from '@/lib/ariadne/jobs/ariadne-embed-v2'
import { isAriadneV2EmbedEnabled } from '@/lib/ariadne/feature-flags'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!isAriadneV2EmbedEnabled()) {
    return NextResponse.json({ error: 'ARIADNE_V2_EMBED_ENABLED is disabled' }, { status: 403 })
  }

  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as
    | {
        contentId?: string
        recipientKey?: string
        source?: 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm'
        pipelineVersion?: string
        encoderProfile?: string
        idempotencyKey?: string
      }
    | null
  if (!body?.contentId || !body?.recipientKey) {
    return NextResponse.json({ error: 'contentId and recipientKey are required' }, { status: 400 })
  }

  const queued = await enqueueAriadneEmbedV2Job(supabase, {
    userId: user.id,
    contentId: body.contentId,
    recipientKey: body.recipientKey,
    source: body.source ?? 'frame_export',
    pipelineVersion: body.pipelineVersion,
    encoderProfile: body.encoderProfile,
    idempotencyKey: body.idempotencyKey,
  })
  if (!queued.ok) return NextResponse.json({ error: queued.error }, { status: 500 })

  return NextResponse.json({
    success: true,
    job: queued.job,
    workerHint: 'Worker should process queued ariadne_embed_v2 jobs asynchronously.',
  })
}

