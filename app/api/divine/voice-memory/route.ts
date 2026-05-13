import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  type DivineVoiceMemoryPayload,
  type ProtocolPlanLeftoverItem,
  VOICE_MEMORY_ACTION_LOG_MAX,
} from '@/lib/divine/voice-memory-types'
import { appendMemory } from '@/lib/divine/divine-memory'
import { runProtocolPlanRollover, utcPlanDateString } from '@/lib/divine/protocol-plan-rollover'
import { isLeftoverTask } from '@/lib/creator-protocol-task-types'

function mergeMemory(
  prev: DivineVoiceMemoryPayload,
  patch: Partial<DivineVoiceMemoryPayload> & { resume_hint?: string | null },
): DivineVoiceMemoryPayload {
  const next: DivineVoiceMemoryPayload = { ...prev }
  for (const key of Object.keys(patch) as (keyof DivineVoiceMemoryPayload)[]) {
    if (key === 'resume_hint') continue
    const v = patch[key]
    if (v !== undefined) {
      ;(next as Record<string, unknown>)[key] = v
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'resume_hint')) {
    if (patch.resume_hint === null) delete next.resume_hint
    else if (patch.resume_hint !== undefined) next.resume_hint = patch.resume_hint
  }
  next.last_updated_at = new Date().toISOString()
  if (patch.action_log?.length) {
    const log = [...(prev.action_log ?? []), ...patch.action_log]
    next.action_log = log.slice(-VOICE_MEMORY_ACTION_LOG_MAX)
  }
  return next
}

/**
 * GET — current divine_voice_memory for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: row, error } = await supabase
      .from('profiles')
      .select('divine_voice_memory')
      .eq('id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await runProtocolPlanRollover(supabase, user.id)
    const today = utcPlanDateString()

    const { data: protoRows } = await supabase
      .from('creator_protocol_tasks')
      .select('id, title, priority_tier, metadata, status')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .in('status', ['pending', 'executing'])
      .limit(30)

    const leftovers: ProtocolPlanLeftoverItem[] = []
    for (const r of protoRows ?? []) {
      const meta =
        r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {}
      if (!isLeftoverTask(meta)) continue
      leftovers.push({
        id: r.id as string,
        title: String(r.title ?? 'Task').slice(0, 300),
        priority_tier: typeof r.priority_tier === 'number' ? r.priority_tier : 4,
      })
    }

    const memory = (row?.divine_voice_memory ?? {}) as DivineVoiceMemoryPayload
    const memoryWithPlan: DivineVoiceMemoryPayload = {
      ...memory,
      ...(leftovers.length
        ? {
            protocol_plan_leftovers: leftovers,
          }
        : {}),
    }

    return NextResponse.json({ memory: memoryWithPlan })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load voice memory'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST — append tool action(s), optional resume_hint / status merge.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      action?: { tool: string; summary: string }
      resume_hint?: string
      status?: DivineVoiceMemoryPayload['status']
      pending_confirmations?: DivineVoiceMemoryPayload['pending_confirmations']
    }

    const { data: row, error: fetchErr } = await supabase
      .from('profiles')
      .select('divine_voice_memory')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const prev = (row?.divine_voice_memory ?? {}) as DivineVoiceMemoryPayload
    const at = new Date().toISOString()
    const patch: DivineVoiceMemoryPayload = {
      last_updated_at: at,
      status: body.status ?? 'in_progress',
    }
    if (body.action?.tool) {
      patch.action_log = [
        {
          tool: body.action.tool,
          summary: String(body.action.summary ?? '').slice(0, 500),
          at,
        },
      ]
    }
    if (typeof body.resume_hint === 'string') {
      patch.resume_hint = body.resume_hint.slice(0, 800)
    }
    if (body.pending_confirmations !== undefined) {
      patch.pending_confirmations = body.pending_confirmations
    }

    const merged = mergeMemory(prev, patch)

    const { error: upErr } = await supabase
      .from('profiles')
      .update({ divine_voice_memory: merged as Record<string, unknown> })
      .eq('id', user.id)

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const hint = typeof body.resume_hint === 'string' ? body.resume_hint.trim() : ''
    const actionSummary =
      body.action?.tool != null ? `${body.action.tool}: ${String(body.action.summary ?? '').trim()}`.trim() : ''
    const memParts = [hint || null, actionSummary || null].filter((x): x is string => Boolean(x?.length))
    if (memParts.length > 0) {
      void appendMemory(supabase, user.id, {
        source: 'voice',
        summary: memParts.join(' — ').slice(0, 900),
        metadata: { tool: body.action?.tool },
      }).catch(() => undefined)
    }

    return NextResponse.json({ ok: true, memory: merged })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update voice memory'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PATCH — disconnect reason, completion, or clear resume state.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      disconnect_reason?: DivineVoiceMemoryPayload['disconnect_reason']
      status?: DivineVoiceMemoryPayload['status']
      resume_hint?: string | null
      clear?: boolean
      /** Set to null to clear deferred navigation after barrier UI applied */
      navigation?: DivineVoiceMemoryPayload['navigation'] | null
      voice_presence?: DivineVoiceMemoryPayload['voice_presence']
    }

    const { data: row, error: fetchErr } = await supabase
      .from('profiles')
      .select('divine_voice_memory')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const prev = (row?.divine_voice_memory ?? {}) as DivineVoiceMemoryPayload
    let merged: DivineVoiceMemoryPayload

    if (body.clear) {
      merged = {
        status: 'completed',
        disconnect_reason: null,
        resume_hint: undefined,
        pending_confirmations: undefined,
        action_log: [],
        tasks: [],
        navigation: null,
        voice_presence: prev.voice_presence,
        last_updated_at: new Date().toISOString(),
      }
    } else {
      const patch: Partial<DivineVoiceMemoryPayload> & { resume_hint?: string | null } = {
        disconnect_reason: body.disconnect_reason ?? prev.disconnect_reason,
        status: body.status ?? prev.status,
        last_updated_at: new Date().toISOString(),
      }
      if (Object.prototype.hasOwnProperty.call(body, 'resume_hint')) {
        const rh = body.resume_hint === null ? null : body.resume_hint?.slice(0, 800)
        ;(patch as { resume_hint?: string | null }).resume_hint = rh
      }
      merged = mergeMemory(prev, patch)
      if (Object.prototype.hasOwnProperty.call(body, 'navigation') && body.navigation === null) {
        merged.navigation = null
      }
      if (body.voice_presence && typeof body.voice_presence === 'object') {
        merged.voice_presence = {
          ...(prev.voice_presence ?? {}),
          ...body.voice_presence,
        }
      }
    }

    const { error: upErr } = await supabase
      .from('profiles')
      .update({ divine_voice_memory: merged as Record<string, unknown> })
      .eq('id', user.id)

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, memory: merged })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to patch voice memory'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
