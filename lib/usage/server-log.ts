import { createServiceRoleClient } from '@/lib/supabase/server'
import { estimateUsdFromTokens, getUnitCostRow } from '@/lib/usage/estimate-cost'
import { sanitizeSafeContext } from '@/lib/usage/sanitize-context'

/** Normalized usage from OpenAI, AI SDK, Anthropic, etc. */
export type UsageObject = {
  inputTokens?: number
  outputTokens?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

function normalizeUsageTokens(u?: UsageObject | null): { input: number; output: number; total: number } {
  const input = Math.max(0, Math.floor(u?.inputTokens ?? u?.promptTokens ?? 0))
  const output = Math.max(0, Math.floor(u?.outputTokens ?? u?.completionTokens ?? 0))
  const total =
    u?.totalTokens != null && Number.isFinite(u.totalTokens)
      ? Math.max(0, Math.floor(u.totalTokens))
      : input + output
  return { input, output, total }
}

/**
 * Central entrypoint: attribute AI spend to a user/feature from any provider shape.
 * Fire-and-forget (service role). Prefer this over logAiUsageEvent in new code.
 */
export function logUsageEvent(opts: {
  userId?: string | null | undefined
  feature: string
  provider: string
  model: string
  usage?: UsageObject | null
  requestId?: string | null
  success?: boolean
  metadata?: Record<string, unknown>
}): void {
  const { input, output, total } = normalizeUsageTokens(opts.usage ?? null)
  logAiUsageEvent({
    userId: opts.userId,
    feature: opts.feature,
    provider: opts.provider,
    model: opts.model,
    inputTokens: input,
    outputTokens: output,
    totalTokens: total,
    requestId: opts.requestId,
    success: opts.success,
    metadata: opts.metadata,
  })
}

/**
 * Fire-and-forget AI usage log (service role). Safe to call from API routes / workers.
 */
export function logAiUsageEvent(opts: {
  userId: string | null | undefined
  feature: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens?: number
  requestId?: string | null
  success?: boolean
  metadata?: Record<string, unknown>
}): void {
  const run = async () => {
    try {
      const supabase = createServiceRoleClient()
      const row = await getUnitCostRow(supabase, opts.model)
      const inT = Math.max(0, Math.floor(opts.inputTokens))
      const outT = Math.max(0, Math.floor(opts.outputTokens))
      const totalT =
        opts.totalTokens != null && Number.isFinite(opts.totalTokens)
          ? Math.max(0, Math.floor(opts.totalTokens))
          : inT + outT
      const estimated = estimateUsdFromTokens(inT, outT, row)
      await supabase.from('ai_usage_events').insert({
        user_id: opts.userId ?? null,
        feature: opts.feature.slice(0, 200),
        provider: opts.provider.slice(0, 64),
        model: opts.model.slice(0, 200),
        input_tokens: inT,
        output_tokens: outT,
        total_tokens: totalT,
        estimated_usd: estimated,
        request_id: opts.requestId?.slice(0, 128) ?? null,
        success: opts.success !== false,
        metadata: opts.metadata ?? null,
      })
    } catch (e) {
      console.warn('[logAiUsageEvent]', e instanceof Error ? e.message : e)
    }
  }
  void run()
}

export function logApiError(opts: {
  userId: string | null | undefined
  route: string
  httpStatus?: number | null
  errorCode?: string | null
  message: string
  stack?: string | null
  /** Prefer safe_context; `context` alias accepted for backwards compatibility. */
  safeContext?: Record<string, unknown> | null
  context?: Record<string, unknown> | null
}): void {
  const run = async () => {
    try {
      const supabase = createServiceRoleClient()
      const raw = opts.safeContext ?? opts.context ?? null
      const safe = sanitizeSafeContext(raw)
      const row: Record<string, unknown> = {
        user_id: opts.userId ?? null,
        route: opts.route.slice(0, 500),
        http_status: opts.httpStatus ?? null,
        error_code: opts.errorCode?.slice(0, 128) ?? null,
        message: opts.message.slice(0, 4000),
        stack: opts.stack?.slice(0, 8000) ?? null,
      }
      row.safe_context = safe
      await supabase.from('api_error_logs').insert(row as never)
    } catch (e) {
      console.warn('[logApiError]', e instanceof Error ? e.message : e)
    }
  }
  void run()
}

export async function logAdminAudit(opts: {
  adminUserId: string
  action: string
  targetUserId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    await supabase.from('admin_audit_log').insert({
      admin_user_id: opts.adminUserId,
      action: opts.action.slice(0, 200),
      target_user_id: opts.targetUserId ?? null,
      payload: opts.payload ?? null,
    })
  } catch (e) {
    console.warn('[logAdminAudit]', e instanceof Error ? e.message : e)
  }
}
