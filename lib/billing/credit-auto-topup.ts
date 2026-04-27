import 'server-only'

export const CREDIT_AUTO_TOPUP_PACK_IDS = [
  'credit-topup-2000',
  'credit-topup-5000',
  'credit-topup-10000',
] as const

export type CreditAutoTopupPackId = (typeof CREDIT_AUTO_TOPUP_PACK_IDS)[number]

export type CreditAutoTopupStatus =
  | 'active'
  | 'paused'
  | 'needs_payment_method'
  | 'requires_action'
  | 'disabled_by_user'

export type CreditAutoTopupSettingsRow = {
  user_id: string
  enabled: boolean
  threshold_credits: number
  pack_id: string
  monthly_max_usd_cents: number
  cooldown_minutes: number
  monthly_spent_usd_cents: number
  monthly_window_start: string
  last_attempt_at: string | null
  last_success_at: string | null
  last_payment_intent_id: string | null
  last_error: string | null
  status: CreditAutoTopupStatus
  consecutive_failures: number
  created_at: string
  updated_at: string
}

export function isCreditAutoTopupGloballyEnabled(): boolean {
  return process.env.CREDIT_AUTO_TOPUP_ENABLED === 'true'
}

export function isCreditAutoTopupDryRun(): boolean {
  return process.env.CREDIT_AUTO_TOPUP_DRY_RUN === 'true'
}

export function creditAutoTopupMaxFailures(): number {
  const n = Number.parseInt(process.env.CREDIT_AUTO_TOPUP_MAX_FAILURES ?? '3', 10)
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 3
}

export function creditAutoTopupMaxChargesPerUtcDay(): number {
  const n = Number.parseInt(process.env.CREDIT_AUTO_TOPUP_MAX_CHARGES_PER_DAY ?? '8', 10)
  return Number.isFinite(n) && n >= 1 && n <= 50 ? n : 8
}

export function creditAutoTopupCronBatchLimit(): number {
  const n = Number.parseInt(process.env.CREDIT_AUTO_TOPUP_CRON_BATCH ?? '50', 10)
  return Number.isFinite(n) && n >= 1 && n <= 200 ? n : 50
}

export function creditAutoTopupUserAllowlist(): Set<string> | null {
  const raw = process.env.CREDIT_AUTO_TOPUP_USER_IDS?.trim()
  if (!raw) return null
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

/** Reset monthly spend counter when a new UTC month started since monthly_window_start. */
export function maybeResetMonthlySpendWindow(row: Pick<CreditAutoTopupSettingsRow, 'monthly_window_start'>): {
  monthly_spent_usd_cents: number
  monthly_window_start: string
} {
  const now = new Date()
  const windowStart = new Date(row.monthly_window_start)
  const currentMonthStart = startOfUtcMonth(now)
  if (windowStart.getTime() < currentMonthStart.getTime()) {
    return {
      monthly_spent_usd_cents: 0,
      monthly_window_start: currentMonthStart.toISOString(),
    }
  }
  return {
    monthly_spent_usd_cents: 0,
    monthly_window_start: row.monthly_window_start,
  }
}

export function defaultCreditAutoTopupSettings(userId: string): CreditAutoTopupSettingsRow {
  const now = new Date()
  return {
    user_id: userId,
    enabled: false,
    threshold_credits: 10_000,
    pack_id: 'credit-topup-2000',
    monthly_max_usd_cents: 500_00,
    cooldown_minutes: 360,
    monthly_spent_usd_cents: 0,
    monthly_window_start: startOfUtcMonth(now).toISOString(),
    last_attempt_at: null,
    last_success_at: null,
    last_payment_intent_id: null,
    last_error: null,
    status: 'disabled_by_user',
    consecutive_failures: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
}

export function normalizeSettingsRow(row: CreditAutoTopupSettingsRow): CreditAutoTopupSettingsRow {
  const reset = maybeResetMonthlySpendWindow(row)
  if (reset.monthly_window_start !== row.monthly_window_start) {
    return {
      ...row,
      monthly_spent_usd_cents: 0,
      monthly_window_start: reset.monthly_window_start,
    }
  }
  return row
}

export function isValidPackId(packId: string): packId is CreditAutoTopupPackId {
  return (CREDIT_AUTO_TOPUP_PACK_IDS as readonly string[]).includes(packId)
}

export function validateAutoTopupPatch(input: {
  enabled?: boolean
  threshold_credits?: number
  pack_id?: string
  monthly_max_usd_cents?: number
  cooldown_minutes?: number
}): string | null {
  if (input.threshold_credits !== undefined) {
    if (!Number.isFinite(input.threshold_credits) || input.threshold_credits < 500 || input.threshold_credits > 5_000_000) {
      return 'threshold_credits must be between 500 and 5,000,000'
    }
  }
  if (input.pack_id !== undefined && !isValidPackId(input.pack_id)) {
    return 'pack_id must be a credit top-up pack'
  }
  if (input.monthly_max_usd_cents !== undefined) {
    if (!Number.isFinite(input.monthly_max_usd_cents) || input.monthly_max_usd_cents < 500 || input.monthly_max_usd_cents > 50_000_00) {
      return 'monthly_max_usd_cents must be between 500 ($5) and 5000000 ($50,000)'
    }
  }
  if (input.cooldown_minutes !== undefined) {
    if (!Number.isFinite(input.cooldown_minutes) || input.cooldown_minutes < 30 || input.cooldown_minutes > 10_080) {
      return 'cooldown_minutes must be between 30 and 10080'
    }
  }
  return null
}
