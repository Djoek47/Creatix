import type { LeakDetectionStatus } from '@/lib/types'

/** Must match `leak_alerts_status_check` in scripts (011 + 051). */
export const LEAK_DETECTION_STATUSES: readonly LeakDetectionStatus[] = [
  'pending',
  'reviewed',
  'confirmed',
  'ignored',
  'dmca_sent',
  'detected',
  'reviewing',
  'resolved',
  'false_positive',
  'scam',
] as const

export const LEAK_ACTIVE_STATUS_SET = new Set<string>(['detected', 'reviewing', 'pending'])

export function isLeakStatusActive(status: string | null | undefined): boolean {
  return LEAK_ACTIVE_STATUS_SET.has(String(status ?? ''))
}

/** UI: how you closed a detection (subset of full statuses). */
export const LEAK_OUTCOME_OPTIONS: {
  value: LeakDetectionStatus
  label: string
  hint: string
}[] = [
  { value: 'detected', label: 'Still reviewing', hint: 'Keep in active queue' },
  { value: 'reviewing', label: 'Escalated review', hint: 'Needs another pass' },
  { value: 'resolved', label: 'Takedown / handled', hint: 'Real leak addressed' },
  { value: 'false_positive', label: 'False positive', hint: 'Not your content or benign' },
  {
    value: 'scam',
    label: 'Scam / bait',
    hint: 'Paywall trap, fake tasks, selling access, endless “verification”',
  },
  { value: 'dmca_sent', label: 'DMCA sent', hint: 'Notice filed; waiting on host' },
  { value: 'ignored', label: 'Ignored', hint: 'Not pursuing this URL' },
]
