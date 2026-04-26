import { NextRequest, NextResponse } from 'next/server'
import { buildRenderEmbedIdempotencyKey, normalizeFocusedClip } from '@/lib/frame/render-contract'

type RenderRequestBody = {
  contentId: string
  recipientKey?: string
  vaultExportToken?: string
  editPlan: unknown
  focusedClip?: {
    id?: string
    mediaName?: string
    trackLabel?: string
    startSec?: number
    endSec?: number
    durationSec?: number
  }
  lineage?: {
    encoderProfile?: string
    planHash?: string
    focusedClip?: {
      id?: string
      mediaName?: string
      trackLabel?: string
      startSec?: number
      endSec?: number
      durationSec?: number
    }
  }
  export?: {
    format?: string
    aspectPreset?: string
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function POST(req: NextRequest) {
  let body: RenderRequestBody
  try {
    body = (await req.json()) as RenderRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const contentId = typeof body.contentId === 'string' ? body.contentId.trim() : ''
  if (!contentId) {
    return NextResponse.json({ error: 'Missing contentId' }, { status: 400 })
  }
  if (!isObject(body.editPlan)) {
    return NextResponse.json({ error: 'Missing editPlan object' }, { status: 400 })
  }

  const version = (body.editPlan as Record<string, unknown>).version
  if (version !== 1) {
    return NextResponse.json({ error: 'Unsupported editPlan version' }, { status: 400 })
  }

  const acceptedAt = new Date().toISOString()
  const jobId = crypto.randomUUID()
  const recipientKey = typeof body.recipientKey === 'string' ? body.recipientKey.trim() : ''
  const vaultExportToken = typeof body.vaultExportToken === 'string' ? body.vaultExportToken.trim() : ''

  const creatixBase = (process.env.NEXT_PUBLIC_CREATIX_APP_URL || 'https://www.circeetvenus.com').replace(/\/$/, '')
  const encoderProfile =
    typeof body.lineage?.encoderProfile === 'string' ? body.lineage.encoderProfile : 'unknown-profile'
  const planHash = typeof body.lineage?.planHash === 'string' ? body.lineage.planHash : 'unknown-plan-hash'
  const format = typeof body.export?.format === 'string' ? body.export.format : 'mp4'
  const aspectPreset = typeof body.export?.aspectPreset === 'string' ? body.export.aspectPreset : '9:16-of'
  const focusedClip = normalizeFocusedClip(body.lineage?.focusedClip, body.focusedClip)

  if (recipientKey && vaultExportToken) {
    const idempotencyKey = buildRenderEmbedIdempotencyKey({
      contentId,
      recipientKey,
      planHash,
      format,
      aspectPreset,
      focusedClipId: focusedClip?.id,
    })
    try {
      const embedRes = await fetch(`${creatixBase}/api/ariadne/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vaultExportToken}`,
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          contentId,
          recipientKey,
          source: 'frame_export',
          lineage: {
            pipelineVersion: 'frame-editor',
            encoderProfile,
            planHash,
            focusedClip: focusedClip?.id ? focusedClip : undefined,
          },
        }),
      })
      const embedData = (await embedRes.json().catch(() => ({}))) as {
        error?: string
        payloadId?: string
        exportId?: string
        downloadUrl?: string
      }
      if (!embedRes.ok) {
        return NextResponse.json(
          {
            error: embedData.error || `Ariadne embed failed (${embedRes.status})`,
            code: 'embed_failed',
          },
          { status: embedRes.status },
        )
      }
      return NextResponse.json({
        ok: true,
        job: {
          id: jobId,
          status: 'queued',
          acceptedAt,
          contentId,
          recipientKey,
          lineage: {
            encoderProfile,
            planHash,
            focusedClip: focusedClip?.id ? focusedClip : null,
          },
          output: {
            format,
            aspectPreset,
          },
          ariadne: {
            payloadId: embedData.payloadId ?? null,
            exportId: embedData.exportId ?? null,
            downloadUrl: embedData.downloadUrl ?? null,
          },
          note: 'render_stub_with_embed',
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Ariadne embed failed',
          code: 'embed_failed',
        },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: jobId,
      status: 'queued',
      acceptedAt,
      contentId,
      recipientKey: recipientKey || null,
      lineage: {
        encoderProfile,
        planHash,
        focusedClip: focusedClip?.id ? focusedClip : null,
      },
      output: {
        format,
        aspectPreset,
      },
      note: 'render_stub_only',
    },
  })
}

