/**
 * Onboarding “orbit” steps: same narrative as the full-app welcome tour (lib/tour-full-app-welcome.ts)
 * with UI metadata (subject chip + theme) for the Guide page.
 */
import type { TourStep } from '@/lib/tour-types'
import { fullAppWelcomeTour } from '@/lib/tour-full-app-welcome'

export type GuideOrbTheme = 'circe' | 'venus' | 'neutral' | 'aurora'

/** Keys must exist in ICON_MAP inside guide-orbit-journey.tsx */
export type GuideOrbitIconKey =
  | 'Sparkles'
  | 'Map'
  | 'LayoutDashboard'
  | 'Crown'
  | 'Calendar'
  | 'HeartPulse'
  | 'MessageSquare'
  | 'Megaphone'
  | 'Share2'
  | 'Library'
  | 'Wand2'
  | 'Zap'
  | 'Bot'
  | 'GitMerge'
  | 'BarChart3'
  | 'TrendingUp'
  | 'Moon'
  | 'Wand'
  | 'Shield'
  | 'ShieldCheck'
  | 'Users'
  | 'Filter'
  | 'MessageCircle'
  | 'AtSign'
  | 'UsersRound'
  | 'BookOpen'
  | 'Settings'
  | 'Plug'
  | 'Route'
  | 'Sun'

/** Theme + icon per tour step id (lib/tour-full-app-welcome.ts). Copy lives in messages/<locale>/guideOrbit.json */
const STEP_UI: Record<string, { theme: GuideOrbTheme; iconKey: GuideOrbitIconKey }> = {
  'full-01': { theme: 'aurora', iconKey: 'Sparkles' },
  'full-02': { theme: 'neutral', iconKey: 'Map' },
  'full-03': { theme: 'neutral', iconKey: 'LayoutDashboard' },
  'full-04': { theme: 'aurora', iconKey: 'Crown' },
  'full-05': { theme: 'neutral', iconKey: 'Calendar' },
  'full-06': { theme: 'venus', iconKey: 'HeartPulse' },
  'full-07': { theme: 'neutral', iconKey: 'MessageSquare' },
  'full-08': { theme: 'venus', iconKey: 'Megaphone' },
  'full-09': { theme: 'venus', iconKey: 'Share2' },
  'full-10': { theme: 'aurora', iconKey: 'Wand2' },
  'full-11': { theme: 'aurora', iconKey: 'Zap' },
  'full-13': { theme: 'venus', iconKey: 'Bot' },
  'full-14': { theme: 'circe', iconKey: 'GitMerge' },
  'full-15': { theme: 'circe', iconKey: 'BarChart3' },
  'full-16': { theme: 'circe', iconKey: 'TrendingUp' },
  'full-17': { theme: 'circe', iconKey: 'Moon' },
  'full-18': { theme: 'circe', iconKey: 'Wand2' },
  'full-19': { theme: 'circe', iconKey: 'Shield' },
  'full-20': { theme: 'circe', iconKey: 'ShieldCheck' },
  'full-21': { theme: 'venus', iconKey: 'Users' },
  'full-22': { theme: 'venus', iconKey: 'Filter' },
  'full-23': { theme: 'venus', iconKey: 'MessageCircle' },
  'full-25': { theme: 'venus', iconKey: 'AtSign' },
  'full-26': { theme: 'venus', iconKey: 'UsersRound' },
  'full-27': { theme: 'circe', iconKey: 'Sun' },
  'full-28': { theme: 'aurora', iconKey: 'BookOpen' },
  'full-29': { theme: 'neutral', iconKey: 'Settings' },
  'full-30': { theme: 'neutral', iconKey: 'Plug' },
  'full-31': { theme: 'aurora', iconKey: 'Route' },
  'full-32': { theme: 'aurora', iconKey: 'Sparkles' },
}

export interface GuideOrbStep extends TourStep {
  theme: GuideOrbTheme
  iconKey: GuideOrbitIconKey
}

export const GUIDE_ORBIT_STEPS: GuideOrbStep[] = fullAppWelcomeTour.steps.map((s) => {
  const ui = STEP_UI[s.id]
  if (!ui) {
    return {
      ...s,
      theme: 'neutral' as const,
      iconKey: 'Sparkles' as const,
    }
  }
  return { ...s, ...ui }
})
