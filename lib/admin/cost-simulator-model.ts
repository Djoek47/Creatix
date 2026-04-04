import type { UnitCostRow } from '@/lib/usage/estimate-cost'
import { estimateUsdFromTokens } from '@/lib/usage/estimate-cost'
import { getMonthlyPriceUsd, type BillingVariant } from '@/lib/pricing-matrix'
import type { AdultBillingPlatform } from '@/lib/billing/platform-variant'
import { getPlanLimits } from '@/lib/billing/plan-limits'
import { PAID_PLAN_ID, TRIAL_PLAN_ID } from '@/lib/billing/access'

/** Calendar-style proration for “per day” subscription slice. */
export const SIMULATOR_DAYS_PER_MONTH = 30

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
}

export interface CostSimulatorLaneBreakdown {
  label: string
  feature: string
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
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

export function computeDailyCostScenario(input: CostSimulatorInput): CostSimulatorResult {
  const crew = Math.min(999, Math.max(1, Math.floor(input.crewSize)))
  const mult = intensityMultiplier(input.intensity)

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
    })
  }

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
