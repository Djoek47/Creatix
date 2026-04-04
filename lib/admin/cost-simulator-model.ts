import type { UnitCostRow } from '@/lib/usage/estimate-cost'
import { estimateUsdFromTokens } from '@/lib/usage/estimate-cost'
import { getMonthlyPriceUsd, type BillingVariant } from '@/lib/pricing-matrix'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { getPlanLimits } from '@/lib/billing/plan-limits'
import { PAID_PLAN_ID, TRIAL_PLAN_ID } from '@/lib/billing/access'

/** Calendar-style proration for “per day” subscription slice. */
export const SIMULATOR_DAYS_PER_MONTH = 30

/**
 * Ballpark Serper list price per search (~$20 / 2.5k). Not live billing — adjust if your tier differs.
 * @see https://serper.dev
 */
export const SERPER_USD_PER_SEARCH = 0.008

/** One reputation run (wide + social, env-capped defaults ≈ 30 + 30) — typical Serper call volume. */
const REPUTATION_SERPER_CALLS_PER_RUN = 58

/** One leak / DMCA-style protection scan (handle + title queries; defaults ≈ 45 + extras). */
const LEAK_SERPER_CALLS_PER_RUN = 52

/** Mini-class tokens per fan “touch” per day at 100% intensity (DM/CRM-style surface). */
const FAN_TOUCH_IN_PER_FAN = 520
const FAN_TOUCH_OUT_PER_FAN = 170

/** Rough in-app credits if we map tokens → credits (for trial cap messaging only). */
const TOKENS_PER_CREDIT_HEURISTIC = 12_000

const COST_GPT4O_MINI: UnitCostRow = {
  model_key: 'gpt-4o-mini',
  usd_per_1m_input: 0.15,
  usd_per_1m_output: 0.6,
}
const COST_GATEWAY_MINI: UnitCostRow = {
  model_key: 'openai/gpt-4o-mini',
  usd_per_1m_input: 0.15,
  usd_per_1m_output: 0.6,
}
const COST_GPT4O: UnitCostRow = {
  model_key: 'gpt-4o',
  usd_per_1m_input: 2.5,
  usd_per_1m_output: 10,
}
const COST_CLAUDE: UnitCostRow = {
  model_key: 'anthropic/claude-sonnet-4',
  usd_per_1m_input: 3,
  usd_per_1m_output: 15,
}
const COST_GROK: UnitCostRow = {
  model_key: 'grok-2-latest',
  usd_per_1m_input: 2,
  usd_per_1m_output: 10,
}

/**
 * Heavy “whole product” mix: most surfaced AI paths at once (daily token budgets at full intensity).
 * Scaled down/up by intensity and crew size.
 */
const SERVICE_LANES: readonly {
  label: string
  feature: string
  baseInPerUserDay: number
  baseOutPerUserDay: number
  unit: UnitCostRow
}[] = [
  {
    label: 'Chatter & DMs',
    feature: 'ai_chatter',
    baseInPerUserDay: 380_000,
    baseOutPerUserDay: 115_000,
    unit: COST_GPT4O_MINI,
  },
  {
    label: 'Gateway (mini stack)',
    feature: 'gateway',
    baseInPerUserDay: 220_000,
    baseOutPerUserDay: 65_000,
    unit: COST_GATEWAY_MINI,
  },
  {
    label: 'Divine manager (4o-class)',
    feature: 'divine_manager',
    baseInPerUserDay: 95_000,
    baseOutPerUserDay: 58_000,
    unit: COST_GPT4O,
  },
  {
    label: 'Pricing / optimizer (Sonnet-class)',
    feature: 'pricing_optimizer',
    baseInPerUserDay: 48_000,
    baseOutPerUserDay: 36_000,
    unit: COST_CLAUDE,
  },
  {
    label: 'Insights & Grok routes',
    feature: 'grok_insights',
    baseInPerUserDay: 140_000,
    baseOutPerUserDay: 95_000,
    unit: COST_GROK,
  },
] as const

export type SimulatorPlanKind = 'trial' | 'paid'

export interface CostSimulatorInput {
  planKind: SimulatorPlanKind
  billingVariant: BillingVariant
  tierIndex: number
  focusPlatforms: AdultBillingPlatform[]
  crewSize: number
  /** 0–100; scales daily token burn (floor 5% so lanes stay visible). */
  intensity: number
  /** Distinct fans a creator actively uses AI against per day (DMs, CRM, chatter context). */
  fansInteractedPerUserPerDay: number
  /** Expected full reputation discovery runs per creator per day (can be fractional, e.g. 0.14 ≈ weekly). */
  reputationScanRunsPerUserPerDay: number
  /** Expected leak / DMCA protection scans per creator per day (fractional allowed). */
  leakScanRunsPerUserPerDay: number
}

export type CostSimulatorLaneKind = 'llm' | 'serper'

export interface CostSimulatorLaneBreakdown {
  label: string
  feature: string
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
  kind: CostSimulatorLaneKind
  /** Serper-only: total google.serper.dev search calls / day in this lane. */
  serperSearches?: number
}

export interface CostSimulatorResult {
  /** Workspace total subscription slice for one day (÷ SIMULATOR_DAYS_PER_MONTH). */
  dailySubscriptionUsd: number
  /** Sum of provider-style estimates across lanes × crew. */
  dailyProviderCostUsd: number
  dailyMarginUsd: number
  marginPctOfSubscription: number | null
  lanes: CostSimulatorLaneBreakdown[]
  monthlySubscriptionUsd: number
  trialCreditsLimitMonthly: number | null
  trialCreditsIncludedPerDay: number | null
  /** If trial: implied credits/month at this daily token pace. */
  trialCreditsImpliedMonthly: number | null
  verdict: 'healthy' | 'tight' | 'underwater' | 'trial_burn'
  verdictHint: string
}

function intensityMultiplier(intensity: number): number {
  const t = Math.min(100, Math.max(0, intensity)) / 100
  const floor = 0.05
  return floor + (1 - floor) * t
}

function clampNonNeg(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(0, n))
}

export function computeDailyCostScenario(input: CostSimulatorInput): CostSimulatorResult {
  const crew = Math.min(999, Math.max(1, Math.floor(input.crewSize)))
  const mult = intensityMultiplier(input.intensity)
  const fans = clampNonNeg(input.fansInteractedPerUserPerDay, 250_000)
  const repRuns = clampNonNeg(input.reputationScanRunsPerUserPerDay, 24)
  const leakRuns = clampNonNeg(input.leakScanRunsPerUserPerDay, 24)

  const monthlySubscriptionUsd =
    input.planKind === 'trial'
      ? 0
      : getMonthlyPriceUsd(input.billingVariant, input.tierIndex, input.focusPlatforms)

  const dailySubscriptionUsd = (monthlySubscriptionUsd * crew) / SIMULATOR_DAYS_PER_MONTH

  const lanes: CostSimulatorLaneBreakdown[] = []
  let dailyProviderCostUsd = 0
  let totalIn = 0
  let totalOut = 0

  for (const lane of SERVICE_LANES) {
    const inT = Math.round(lane.baseInPerUserDay * mult * crew)
    const outT = Math.round(lane.baseOutPerUserDay * mult * crew)
    const estimatedUsd = estimateUsdFromTokens(inT, outT, lane.unit)
    totalIn += inT
    totalOut += outT
    dailyProviderCostUsd += estimatedUsd
    lanes.push({
      label: lane.label,
      feature: lane.feature,
      inputTokens: inT,
      outputTokens: outT,
      estimatedUsd,
      kind: 'llm',
    })
  }

  const fanIn = Math.round(fans * FAN_TOUCH_IN_PER_FAN * mult * crew)
  const fanOut = Math.round(fans * FAN_TOUCH_OUT_PER_FAN * mult * crew)
  const fanUsd = estimateUsdFromTokens(fanIn, fanOut, COST_GPT4O_MINI)
  totalIn += fanIn
  totalOut += fanOut
  dailyProviderCostUsd += fanUsd
  lanes.push({
    label: 'Fan-touch AI (CRM / DMs)',
    feature: 'fan_interactions',
    inputTokens: fanIn,
    outputTokens: fanOut,
    estimatedUsd: fanUsd,
    kind: 'llm',
  })

  const repSearches = Math.round(crew * repRuns * REPUTATION_SERPER_CALLS_PER_RUN)
  const repUsd = repSearches * SERPER_USD_PER_SEARCH
  dailyProviderCostUsd += repUsd
  lanes.push({
    label: 'Serper — reputation discovery',
    feature: 'serper_reputation',
    inputTokens: 0,
    outputTokens: 0,
    estimatedUsd: repUsd,
    kind: 'serper',
    serperSearches: repSearches,
  })

  const leakSearches = Math.round(crew * leakRuns * LEAK_SERPER_CALLS_PER_RUN)
  const leakUsd = leakSearches * SERPER_USD_PER_SEARCH
  dailyProviderCostUsd += leakUsd
  lanes.push({
    label: 'Serper — DMCA / leak scan',
    feature: 'serper_leak',
    inputTokens: 0,
    outputTokens: 0,
    estimatedUsd: leakUsd,
    kind: 'serper',
    serperSearches: leakSearches,
  })

  const dailyMarginUsd = dailySubscriptionUsd - dailyProviderCostUsd
  const marginPctOfSubscription =
    dailySubscriptionUsd > 1e-6 ? (dailyMarginUsd / dailySubscriptionUsd) * 100 : null

  const limits = getPlanLimits(input.planKind === 'trial' ? TRIAL_PLAN_ID : PAID_PLAN_ID)
  const trialCreditsLimitMonthly = input.planKind === 'trial' ? limits.ai_credits_limit : null
  const trialCreditsIncludedPerDay =
    input.planKind === 'trial' && trialCreditsLimitMonthly != null
      ? trialCreditsLimitMonthly / SIMULATOR_DAYS_PER_MONTH
      : null

  const dailyTokenMass = totalIn + totalOut
  const impliedMonthlyTokens = dailyTokenMass * SIMULATOR_DAYS_PER_MONTH
  const trialCreditsImpliedMonthly =
    input.planKind === 'trial'
      ? Math.ceil(impliedMonthlyTokens / TOKENS_PER_CREDIT_HEURISTIC)
      : null

  let verdict: CostSimulatorResult['verdict']
  let verdictHint: string

  if (input.planKind === 'trial') {
    verdict = 'trial_burn'
    const over =
      trialCreditsImpliedMonthly != null &&
      trialCreditsLimitMonthly != null &&
      trialCreditsImpliedMonthly > trialCreditsLimitMonthly
    verdictHint = over
      ? `At this daily pace, implied usage exceeds the ~${trialCreditsLimitMonthly} trial credits/month heuristic — paid tier assumes unlimited in-app credits.`
      : 'Trial pays $0/day; provider cost is your daily burn. Numbers are illustrative (token→credit mapping is approximate).'
  } else if (dailyMarginUsd < 0) {
    verdict = 'underwater'
    verdictHint =
      'Estimated daily provider cost exceeds the prorated subscription slice — tune intensity or revisit unit costs.'
  } else if (marginPctOfSubscription != null && marginPctOfSubscription < 12) {
    verdict = 'tight'
    verdictHint = 'Positive but thin — small shifts in model mix or volume move the needle quickly.'
  } else {
    verdict = 'healthy'
    verdictHint = 'Comfortable headroom vs this heavy multi-service daily scenario.'
  }

  return {
    dailySubscriptionUsd,
    dailyProviderCostUsd,
    dailyMarginUsd,
    marginPctOfSubscription,
    lanes,
    monthlySubscriptionUsd: monthlySubscriptionUsd * crew,
    trialCreditsLimitMonthly,
    trialCreditsIncludedPerDay,
    trialCreditsImpliedMonthly,
    verdict,
    verdictHint,
  }
}
