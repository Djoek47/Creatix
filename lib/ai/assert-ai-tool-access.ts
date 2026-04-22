/**
 * Shared auth + AI credit gate for POST /api/ai/* tool routes.
 *
 * Policy: require session; if tool cost > 0, require sufficient balance before any provider work;
 * after a successful model response, call chargeAiToolCreditsAfterSuccess (never swallow failures).
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getToolMeta, resolveCanonicalToolId } from '@/lib/ai-tools-data'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import {
  consumeAiCredits,
  hasEnoughAiCredits,
  insufficientAiCreditsResponse,
} from '@/lib/billing/consume-ai-credits'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export type AiToolAccessSuccess = {
  supabase: SupabaseClient
  userId: string
  /** Canonical id for billing (aliases resolved). */
  billingToolId: string
  cost: number
}

export async function requireAiToolSessionAndCredits(
  req: NextRequest,
  toolId: string,
): Promise<{ ok: true; data: AiToolAccessSuccess } | { ok: false; response: NextResponse }> {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const billingToolId = resolveCanonicalToolId(toolId)
  const meta = getToolMeta(billingToolId)
  if (meta?.comingSoon) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'This tool is not available yet.' }, { status: 503 }),
    }
  }

  const cost = getCreditsForToolId(billingToolId)
  if (cost > 0) {
    const gate = await hasEnoughAiCredits(supabase, user.id, cost)
    if (!gate.ok) {
      return { ok: false, response: insufficientAiCreditsResponse(gate.used, gate.limit) }
    }
  }

  return { ok: true, data: { supabase, userId: user.id, billingToolId, cost } }
}

/** Billable stream outcomes — do not debit on error / abort. */
export function shouldBillAiStreamFinish(finishReason: string | undefined): boolean {
  return finishReason == null || finishReason === 'stop' || finishReason === 'length'
}

export async function chargeAiToolCreditsAfterSuccess(
  supabase: SupabaseClient,
  userId: string,
  cost: number,
): Promise<{ ok: true; usedAfter?: number } | { ok: false; response: NextResponse }> {
  if (cost <= 0) return { ok: true }
  const r = await consumeAiCredits(supabase, userId, cost)
  if (!r.ok) {
    console.error('[ai-credits] consume failed after successful model run', { userId, cost })
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Could not record AI credit usage. Contact support if this persists.',
          code: 'ai_credits_commit_failed',
        },
        { status: 500 },
      ),
    }
  }
  return { ok: true, usedAfter: r.usedAfter }
}
