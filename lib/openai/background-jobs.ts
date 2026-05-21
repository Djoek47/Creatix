import { createServiceRoleClient } from '@/lib/supabase/server'
import type { OpenaiJobFeature } from '@/lib/openai/openai-job-feature'

const RESPONSES_MODEL_DEFAULT = () =>
  process.env.OPENAI_BACKGROUND_RESPONSES_MODEL?.trim() || 'gpt-4o-mini'

type CreateJobArgs = {
  userId: string
  feature: OpenaiJobFeature
  /** Short ping model input (real work happens in webhook handler for most features). */
  input: string
  instructions?: string
  divineManagerTaskId?: string | null
  requestMetadata?: Record<string, unknown>
  model?: string
}

/**
 * Registers a queued row and kicks off OpenAI Responses in background mode.
 * Webhook completes the workflow via feature handlers.
 */
export async function createOpenAiBackgroundJob(args: CreateJobArgs): Promise<{
  ok: boolean
  jobId?: string
  responseId?: string | null
  error?: string
}> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY is not set' }

  const supabase = createServiceRoleClient()
  const meta = args.requestMetadata ?? {}

  const { data: inserted, error: insErr } = await supabase
    .from('openai_jobs')
    .insert({
      user_id: args.userId,
      response_id: null,
      feature: args.feature,
      model: args.model ?? RESPONSES_MODEL_DEFAULT(),
      status: 'queued',
      divine_manager_task_id: args.divineManagerTaskId ?? null,
      request_metadata: {
        ...meta,
        creatix_feature: args.feature,
        creatix_user_id: args.userId,
      },
    })
    .select('id')
    .single()

  const jobRow = inserted as { id?: string } | null
  if (insErr || !jobRow?.id) {
    return { ok: false, error: insErr?.message ?? 'failed to insert openai_jobs' }
  }

  const jobId = jobRow.id

  const body: Record<string, unknown> = {
    model: args.model ?? RESPONSES_MODEL_DEFAULT(),
    background: true,
    metadata: {
      creatix_job_id: jobId,
      creatix_user_id: args.userId,
      creatix_feature: args.feature,
    },
    input: args.input,
  }
  if (args.instructions?.trim()) {
    body.instructions = args.instructions.trim()
  }

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const raw = await res.text()
    let json: Record<string, unknown> = {}
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    } catch {
      json = {}
    }

    const responseId = typeof json.id === 'string' ? json.id : null
    const errMsg =
      typeof (json.error as Record<string, unknown> | undefined)?.message === 'string'
        ? String((json.error as { message?: string }).message)
        : !res.ok
          ? raw.slice(0, 240)
          : null

    if (!res.ok || !responseId) {
      await supabase
        .from('openai_jobs')
        .update({
          status: 'failed',
          error_message: errMsg ?? `HTTP_${res.status}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      return {
        ok: false,
        error: errMsg ?? `OpenAI responses error (${res.status})`,
        jobId,
      }
    }

    await supabase
      .from('openai_jobs')
      .update({
        response_id: responseId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (args.divineManagerTaskId) {
      try {
        const { data: cur } = await supabase
          .from('divine_manager_tasks')
          .select('payload')
          .eq('id', args.divineManagerTaskId)
          .maybeSingle()
        const prevPayload = ((cur as { payload?: Record<string, unknown> } | null)?.payload ??
          {}) as Record<string, unknown>
        await supabase
          .from('divine_manager_tasks')
          .update({
            status: 'scheduled',
            payload: {
              ...prevPayload,
              creatix_openai_job_id: jobId,
              openai_response_id: responseId,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', args.divineManagerTaskId)
      } catch {
        /* dual-write mirror is best-effort */
      }
    }

    return { ok: true, jobId, responseId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed'
    await supabase
      .from('openai_jobs')
      .update({
        status: 'failed',
        error_message: msg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    return { ok: false, jobId, error: msg }
  }
}
