import { CREDIT_USD_VALUE } from '@/lib/billing/credit-economics'
import { getAppCreditUsdEstimate } from '@/lib/admin/credit-usd'

export type HybridCreditModel = {
  baseUsdPerCredit: number
  featureOverrides: Record<string, number>
}

function sanitizeUsdPerCredit(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

function parseOverrides(): Record<string, number> {
  const raw = process.env.ADMIN_CREDIT_USD_OVERRIDES_JSON
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const k = key.trim().toLowerCase()
      if (!k) continue
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) continue
      out[k] = n
    }
    return out
  } catch {
    return {}
  }
}

export function getHybridCreditModel(): HybridCreditModel {
  const defaultBase = sanitizeUsdPerCredit(getAppCreditUsdEstimate(), CREDIT_USD_VALUE)
  const envBase = process.env.ADMIN_HYBRID_BASE_USD_PER_CREDIT
  const baseUsdPerCredit = sanitizeUsdPerCredit(envBase, defaultBase)
  return {
    baseUsdPerCredit,
    featureOverrides: parseOverrides(),
  }
}

export function getFeatureUsdPerCredit(feature: string, model = getHybridCreditModel()): number {
  const key = String(feature ?? '').trim().toLowerCase()
  if (key && model.featureOverrides[key] != null) {
    return model.featureOverrides[key]
  }
  return model.baseUsdPerCredit
}

export function estimateCreditsForFeatureUsd(feature: string, usd: number, model = getHybridCreditModel()): number {
  const usdPerCredit = getFeatureUsdPerCredit(feature, model)
  if (!Number.isFinite(usd) || usd <= 0 || usdPerCredit <= 0) return 0
  return usd / usdPerCredit
}

export function estimateCashForCredits(credits: number, model = getHybridCreditModel()): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0
  return credits * model.baseUsdPerCredit
}
