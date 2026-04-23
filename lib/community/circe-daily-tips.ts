/**
 * Curated “daily” tips from Circe — one highlighted per calendar day (rotates by day-of-year).
 * Active set: 40 OnlyFans / creator-economy research insights (`circe-daily-tips-of-insights.ts`).
 * For archived Creatix product tips (v1), import `CIRCE_DAILY_TIPS_LEGACY` from this module.
 * Optional `link` per tip (in-app routes or https URLs).
 */

import { OF_CREATOR_INSIGHTS } from './circe-daily-tips-of-insights'

export type CirceDailyTip = {
  id: string
  title: string
  body: string
  /** Optional call-to-action link shown under the tip */
  link?: { label: string; href: string }
}

export const CIRCE_DAILY_TIPS: CirceDailyTip[] = OF_CREATOR_INSIGHTS

/** v1: sync, vault, mass DMs, Divine — not in rotation; kept for reference. */
export { CIRCE_DAILY_TIPS_LEGACY } from './circe-daily-tips-legacy'

/** Stable index for “today” (UTC day-of-year). */
export function getCirceTipIndexForToday(): number {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0))
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  if (CIRCE_DAILY_TIPS.length === 0) return 0
  return dayOfYear % CIRCE_DAILY_TIPS.length
}

export function getTodayCirceTip(): CirceDailyTip {
  return CIRCE_DAILY_TIPS[getCirceTipIndexForToday()]!
}

export function getCirceTipCount(): number {
  return CIRCE_DAILY_TIPS.length
}

/** Random tip for popups; avoids immediate repeat of `excludeId` when possible. */
export function pickRandomCirceTip(excludeId?: string | null): CirceDailyTip {
  const tips = CIRCE_DAILY_TIPS
  if (tips.length === 0) {
    throw new Error('CIRCE_DAILY_TIPS is empty')
  }
  let tip = tips[Math.floor(Math.random() * tips.length)]!
  if (excludeId && tips.length > 1) {
    let guard = 0
    while (tip.id === excludeId && guard++ < 32) {
      tip = tips[Math.floor(Math.random() * tips.length)]!
    }
  }
  return tip
}
