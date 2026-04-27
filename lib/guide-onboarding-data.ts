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

const STEP_UI: Record<
  string,
  { subjectLabel: string; theme: GuideOrbTheme; iconKey: GuideOrbitIconKey }
> = {
  'full-01': { subjectLabel: 'Welcome card', theme: 'aurora', iconKey: 'Sparkles' },
  'full-02': { subjectLabel: 'Your CRM map', theme: 'neutral', iconKey: 'Map' },
  'full-03': { subjectLabel: 'Dashboard', theme: 'neutral', iconKey: 'LayoutDashboard' },
  'full-04': { subjectLabel: 'Divine Manager', theme: 'aurora', iconKey: 'Crown' },
  'full-05': { subjectLabel: 'Content', theme: 'neutral', iconKey: 'Calendar' },
  'full-06': { subjectLabel: 'Well-being', theme: 'venus', iconKey: 'HeartPulse' },
  'full-07': { subjectLabel: 'Messages', theme: 'neutral', iconKey: 'MessageSquare' },
  'full-08': { subjectLabel: 'Mass DM', theme: 'venus', iconKey: 'Megaphone' },
  'full-09': { subjectLabel: 'Social', theme: 'venus', iconKey: 'Share2' },
  'full-10': { subjectLabel: 'Content library', theme: 'neutral', iconKey: 'Library' },
  'full-11': { subjectLabel: 'AI Studio', theme: 'aurora', iconKey: 'Wand2' },
  'full-12': { subjectLabel: 'Tools & credits', theme: 'aurora', iconKey: 'Zap' },
  'full-13': { subjectLabel: 'Chatter & gifts', theme: 'venus', iconKey: 'Bot' },
  'full-14': { subjectLabel: 'Circe vs Venus', theme: 'circe', iconKey: 'GitMerge' },
  'full-15': { subjectLabel: 'Analytics', theme: 'circe', iconKey: 'BarChart3' },
  'full-16': { subjectLabel: 'Income Predictor', theme: 'circe', iconKey: 'TrendingUp' },
  'full-17': { subjectLabel: 'Retention & churn', theme: 'circe', iconKey: 'Moon' },
  'full-18': { subjectLabel: 'Churn Predictor (tool)', theme: 'circe', iconKey: 'Wand2' },
  'full-19': { subjectLabel: 'Protection', theme: 'circe', iconKey: 'Shield' },
  'full-20': { subjectLabel: 'Aegis', theme: 'circe', iconKey: 'ShieldCheck' },
  'full-21': { subjectLabel: 'Fans CRM', theme: 'venus', iconKey: 'Users' },
  'full-22': { subjectLabel: 'Fan classification', theme: 'venus', iconKey: 'Filter' },
  'full-23': { subjectLabel: 'Commenter', theme: 'venus', iconKey: 'MessageCircle' },
  'full-25': { subjectLabel: 'Mentions', theme: 'venus', iconKey: 'AtSign' },
  'full-26': { subjectLabel: 'Community', theme: 'venus', iconKey: 'UsersRound' },
  'full-27': { subjectLabel: 'Circe daily tips', theme: 'circe', iconKey: 'Sun' },
  'full-28': { subjectLabel: 'Guide (this page)', theme: 'aurora', iconKey: 'BookOpen' },
  'full-29': { subjectLabel: 'Settings', theme: 'neutral', iconKey: 'Settings' },
  'full-30': { subjectLabel: 'Integrations', theme: 'neutral', iconKey: 'Plug' },
  'full-31': { subjectLabel: 'Start Tour (header)', theme: 'aurora', iconKey: 'Route' },
  'full-32': { subjectLabel: 'You’re ready', theme: 'aurora', iconKey: 'Sparkles' },
}

export interface GuideOrbStep extends TourStep {
  subjectLabel: string
  theme: GuideOrbTheme
  iconKey: GuideOrbitIconKey
}

export const GUIDE_ORBIT_STEPS: GuideOrbStep[] = fullAppWelcomeTour.steps.map((s) => {
  const ui = STEP_UI[s.id]
  if (!ui) {
    return {
      ...s,
      subjectLabel: s.title,
      theme: 'neutral' as const,
      iconKey: 'Sparkles' as const,
    }
  }
  return { ...s, ...ui }
})
