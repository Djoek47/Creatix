import type { SupabaseClient } from '@supabase/supabase-js'

export type UnitCostRow = {
  model_key: string
  usd_per_1m_input: number
  usd_per_1m_output: number
}

/** In-memory fallback if DB row missing (matches seed defaults). */
const FALLBACK: Record<string, UnitCostRow> = {
  'gpt-4o-mini': { model_key: 'gpt-4o-mini', usd_per_1m_input: 0.15, usd_per_1m_output: 0.6 },
  default: { model_key: 'default', usd_per_1m_input: 0.5, usd_per_1m_output: 2.0 },
}

export function estimateUsdFromTokens(
  inputTokens: number,
  outputTokens: number,
  row: UnitCostRow,
): number {
  const inCost = (inputTokens / 1_000_000) * Number(row.usd_per_1m_input)
  const outCost = (outputTokens / 1_000_000) * Number(row.usd_per_1m_output)
  return Math.round((inCost + outCost) * 1e8) / 1e8
}

/** Service-role Supabase client. */
export async function getUnitCostRow(
  supabase: SupabaseClient,
  model: string,
): Promise<UnitCostRow> {
  const key = model.trim() || 'default'
  const { data } = await supabase
    .from('ai_unit_costs')
    .select('model_key, usd_per_1m_input, usd_per_1m_output')
    .eq('model_key', key)
    .maybeSingle()

  if (data && typeof data.usd_per_1m_input === 'number' && typeof data.usd_per_1m_output === 'number') {
    return {
      model_key: String(data.model_key),
      usd_per_1m_input: Number(data.usd_per_1m_input),
      usd_per_1m_output: Number(data.usd_per_1m_output),
    }
  }

  const { data: fallback } = await supabase
    .from('ai_unit_costs')
    .select('model_key, usd_per_1m_input, usd_per_1m_output')
    .eq('model_key', 'default')
    .maybeSingle()

  if (
    fallback &&
    typeof fallback.usd_per_1m_input === 'number' &&
    typeof fallback.usd_per_1m_output === 'number'
  ) {
    return {
      model_key: 'default',
      usd_per_1m_input: Number(fallback.usd_per_1m_input),
      usd_per_1m_output: Number(fallback.usd_per_1m_output),
    }
  }

  return FALLBACK[key] ?? FALLBACK.default
}
