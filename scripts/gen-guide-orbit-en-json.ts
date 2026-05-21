/**
 * Writes messages/en/guideOrbit.json from tour + chip labels.
 * Run: npx tsx scripts/gen-guide-orbit-en-json.ts
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fullAppWelcomeTour } from '../lib/tour-full-app-welcome'

const SUBJECT_LABELS: Record<string, string> = {
  'full-01': 'Welcome card',
  'full-02': 'How it fits',
  'full-03': 'Dashboard',
  'full-04': 'Divine Manager',
  'full-05': 'Content',
  'full-06': 'Well-being',
  'full-07': 'Messages',
  'full-08': 'Mass DM',
  'full-09': 'Social',
  'full-10': 'AI Studio',
  'full-11': 'Tools & credits',
  'full-13': 'Chatter & gifts',
  'full-14': 'Circe vs Venus',
  'full-15': 'Analytics',
  'full-16': 'Income Predictor',
  'full-17': 'Retention & churn',
  'full-18': 'Churn Predictor (tool)',
  'full-19': 'Protection',
  'full-20': 'Aegis',
  'full-21': 'Fans',
  'full-22': 'Fan classification',
  'full-23': 'Commenter',
  'full-25': 'Mentions',
  'full-26': 'Community',
  'full-27': 'Circe daily tips',
  'full-28': 'Guide (this page)',
  'full-29': 'Settings',
  'full-30': 'Integrations',
  'full-31': 'Start Tour (header)',
  'full-32': "You're ready",
}

const steps: Record<string, { title: string; description: string; subjectLabel: string }> = {}
for (const s of fullAppWelcomeTour.steps) {
  steps[s.id] = {
    title: s.title,
    description: s.description,
    subjectLabel: SUBJECT_LABELS[s.id] ?? s.title,
  }
}

const root = join(process.cwd())
const outPath = join(root, 'messages', 'en', 'guideOrbit.json')
writeFileSync(outPath, JSON.stringify({ steps }, null, 2) + '\n', 'utf8')
console.log('Wrote', outPath)
