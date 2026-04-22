export type CreditPlanPriority = 'dm_growth' | 'dmca' | 'reputation' | 'chat_support'
export type CreditPlanCreatorSize = 'solo' | 'small_team' | 'agency'

export type CreditPlanInput = {
  monthlyCreditsAvailable: number
  creatorSize: CreditPlanCreatorSize
  priorities: CreditPlanPriority[]
  targetActivityVolume: {
    messages?: number
    leakScans?: number
    reputationScans?: number
    chatTurns?: number
  }
}

export type CreditPlanOutput = {
  allocations: Array<{
    category: CreditPlanPriority
    credits: number
    percent: number
    estimatedActions: number
  }>
  projectedMonthlySpend: number
  estimatedDaysToDepletion: number
  safeModeSuggestion: string | null
}

const CATEGORY_COST: Record<CreditPlanPriority, number> = {
  dm_growth: 1,
  dmca: 42,
  reputation: 48,
  chat_support: 1,
}

const DEFAULT_WEIGHTS: Record<CreditPlanCreatorSize, Record<CreditPlanPriority, number>> = {
  solo: { dm_growth: 0.45, dmca: 0.2, reputation: 0.15, chat_support: 0.2 },
  small_team: { dm_growth: 0.4, dmca: 0.25, reputation: 0.15, chat_support: 0.2 },
  agency: { dm_growth: 0.35, dmca: 0.3, reputation: 0.2, chat_support: 0.15 },
}

function expectedDemand(input: CreditPlanInput): Record<CreditPlanPriority, number> {
  const v = input.targetActivityVolume
  return {
    dm_growth: Math.max(0, Math.floor(v.messages ?? 0)),
    dmca: Math.max(0, Math.floor(v.leakScans ?? 0)),
    reputation: Math.max(0, Math.floor(v.reputationScans ?? 0)),
    chat_support: Math.max(0, Math.floor(v.chatTurns ?? 0)),
  }
}

export function buildCreditPlan(input: CreditPlanInput): CreditPlanOutput {
  const credits = Math.max(0, Math.floor(input.monthlyCreditsAvailable))
  const weightBase = { ...DEFAULT_WEIGHTS[input.creatorSize] }
  if (input.priorities.length > 0) {
    for (const p of input.priorities) weightBase[p] += 0.15
  }

  const totalWeight = Object.values(weightBase).reduce((a, b) => a + b, 0) || 1
  const demand = expectedDemand(input)

  const allocations: CreditPlanOutput['allocations'] = (Object.keys(weightBase) as CreditPlanPriority[]).map(
    (category) => {
      const share = weightBase[category] / totalWeight
      const bucket = Math.floor(credits * share)
      const categoryDemandCredits = demand[category] * CATEGORY_COST[category]
      const allocated = Math.max(bucket, Math.min(categoryDemandCredits, credits))
      return {
        category,
        credits: allocated,
        percent: credits > 0 ? Math.round((allocated / credits) * 100) : 0,
        estimatedActions:
          CATEGORY_COST[category] > 0 ? Math.floor(allocated / CATEGORY_COST[category]) : allocated,
      }
    },
  )

  const normalizedTotal = allocations.reduce((sum, a) => sum + a.credits, 0)
  if (normalizedTotal > credits) {
    const ratio = credits / normalizedTotal
    for (const row of allocations) {
      row.credits = Math.floor(row.credits * ratio)
      row.percent = credits > 0 ? Math.round((row.credits / credits) * 100) : 0
      row.estimatedActions = Math.floor(row.credits / CATEGORY_COST[row.category])
    }
  }

  const projectedMonthlySpend = allocations.reduce((sum, a) => sum + a.credits, 0)
  const dailyBurn = projectedMonthlySpend / 30
  const estimatedDaysToDepletion = dailyBurn > 0 ? Math.max(1, Math.floor(credits / dailyBurn)) : 30
  const safeModeSuggestion =
    projectedMonthlySpend > credits
      ? 'Projected overrun. Prioritize DM growth + chat, and reduce DMCA/reputation scan frequency this month.'
      : estimatedDaysToDepletion < 20
        ? 'Tight runway. Keep leak scans for high-risk signals only and use lightweight message generation.'
        : null

  return {
    allocations,
    projectedMonthlySpend,
    estimatedDaysToDepletion,
    safeModeSuggestion,
  }
}
