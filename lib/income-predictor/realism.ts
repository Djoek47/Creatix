import { getTierByIndex, tierIndexFromMonthlyRevenue, type RevenueTierRow } from '@/lib/pricing-matrix'
import type { IncomePredictorFocusMode } from '@/lib/income-predictor/mode'

export type RealismLevel = 'realistic' | 'ambitious' | 'unrealistic'

/**
 * Next revenue band (subscription pricing matrix) after the band that contains `currentMonthlyUsd`.
 */
export function nextRevenueBandGoalUsd(currentMonthlyUsd: number | null): {
  goalUsd: number | null
  bandLabel: string | null
  isTopBand: boolean
} {
  if (currentMonthlyUsd == null || !Number.isFinite(currentMonthlyUsd) || currentMonthlyUsd <= 0) {
    return { goalUsd: null, bandLabel: null, isTopBand: false }
  }
  const curIdx = tierIndexFromMonthlyRevenue(currentMonthlyUsd)
  const next = getTierByIndex(curIdx + 1)
  if (!next) {
    return { goalUsd: null, bandLabel: null, isTopBand: true }
  }
  const goalUsd = Math.max(next.minUsd, Math.ceil(currentMonthlyUsd + 1))
  return { goalUsd, bandLabel: next.label, isTopBand: false }
}

export type GoalRealismAssessment = {
  level: RealismLevel
  message: string
  suggestedNextTierOrRange: string | null
  impliedMultiplier: number | null
  currentTierIndex: number | null
  goalTierIndex: number | null
}

function tierLabel(t: RevenueTierRow | undefined): string {
  return t?.label ?? '—'
}

/**
 * Heuristic goal check: extreme jumps (e.g. $1k → $800k) are flagged; suggests intermediate revenue band from REVENUE_TIERS.
 */
export function assessGoalRealism(args: {
  currentMonthlyUsd: number | null
  goalUsd: number | null
  mode: 'maintain' | 'grow'
}): GoalRealismAssessment {
  const { mode, goalUsd } = args
  const current = args.currentMonthlyUsd != null && Number.isFinite(args.currentMonthlyUsd) ? Math.max(0, args.currentMonthlyUsd) : null

  if (mode === 'maintain') {
    return {
      level: 'realistic',
      message:
        'Maintain mode targets your current run rate. Focus on consistency, retention, and leak protection rather than aggressive growth.',
      suggestedNextTierOrRange: null,
      impliedMultiplier: null,
      currentTierIndex: current != null ? tierIndexFromMonthlyRevenue(current) : null,
      goalTierIndex: current != null ? tierIndexFromMonthlyRevenue(current) : null,
    }
  }

  const g = goalUsd != null && Number.isFinite(goalUsd) && goalUsd > 0 ? goalUsd : null
  if (g == null) {
    return {
      level: 'realistic',
      message:
        mode === 'next_tier'
          ? 'No higher revenue band is available from your current estimate—you may already be at the top tier, or we need a clearer monthly baseline.'
          : 'Set a dollar target in Grow mode to evaluate how ambitious your next-month goal is.',
      suggestedNextTierOrRange: null,
      impliedMultiplier: null,
      currentTierIndex: current != null ? tierIndexFromMonthlyRevenue(current) : null,
      goalTierIndex: null,
    }
  }

  const base = current != null && current > 0 ? current : Math.max(g / 10, 1)
  const impliedMultiplier = g / base
  const curIdx = current != null ? tierIndexFromMonthlyRevenue(current) : null
  const goalIdx = tierIndexFromMonthlyRevenue(g)

  let level: RealismLevel = 'realistic'
  if (impliedMultiplier > 20 || goalIdx - (curIdx ?? 0) > 3) {
    level = 'unrealistic'
  } else if (impliedMultiplier > 5 || goalIdx - (curIdx ?? 0) > 1) {
    level = 'ambitious'
  }

  const intermediate = getTierByIndex(Math.min(10, Math.max(0, (curIdx ?? goalIdx) + 1)))
  let suggestedNextTierOrRange: string | null = null
  if (level !== 'realistic' && intermediate && curIdx != null && goalIdx > curIdx) {
    suggestedNextTierOrRange = tierLabel(intermediate)
  } else if (level === 'unrealistic' && curIdx != null) {
    const step = getTierByIndex(Math.min(10, curIdx + 1))
    suggestedNextTierOrRange = step ? tierLabel(step) : null
  }

  let message: string
  if (level === 'unrealistic') {
    message =
      mode === 'next_tier'
        ? `Even the next revenue band (~$${Math.round(g).toLocaleString()}/mo) is a very large single-month leap from about $${Math.round(base).toLocaleString()}. Try a custom intermediate target, or extend the horizon.`
        : `A jump from about $${Math.round(base).toLocaleString()} to $${Math.round(g).toLocaleString()} in one month is not a realistic planning anchor. Use a smaller step (e.g. the next revenue band) and iterate.`
  } else if (level === 'ambitious') {
    message =
      mode === 'next_tier'
        ? `The next revenue band (~$${Math.round(g).toLocaleString()}/mo) is a stretch for one month (${impliedMultiplier.toFixed(1)}×)—treat it as an upside case, not a baseline budget.`
        : `A ${impliedMultiplier.toFixed(1)}× move in one month is possible but requires strong execution and some luck—treat it as a stretch, not a baseline budget.`
  } else {
    message =
      mode === 'next_tier'
        ? `The next revenue band (~$${Math.round(g).toLocaleString()}/mo) is a measured step from your current run rate—reasonable as a one-month planning anchor if cadence and monetization hold.`
        : 'Your goal is in a reasonable range for a one-month planning horizon if you keep cadence and monetization tight.'
  }

  return {
    level,
    message,
    suggestedNextTierOrRange,
    impliedMultiplier: impliedMultiplier,
    currentTierIndex: curIdx,
    goalTierIndex: goalIdx,
  }
}
