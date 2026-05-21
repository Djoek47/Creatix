/**
 * Derived “Leak flow” checkpoints for UI (link opened is client-local; others from DB rows).
 */

import type { LeakUserCaseStatus } from '@/lib/types'

const TRIAGE_BUCKET = new Set<string>(['detected', 'pending', 'reviewing'])

/** User has moved off the default detection bucket into a concrete outcome. */
export function isLeakDetectionTriaged(detectionStatus: string | undefined): boolean {
  const s = String(detectionStatus ?? 'detected')
  return !TRIAGE_BUCKET.has(s)
}

/** Closing the operational loop — file sent, waived, or case marked resolved paths. */
export function isLeakFlowClosed(
  caseStatus: LeakUserCaseStatus | undefined,
  detectionStatus: string | undefined,
): boolean {
  const c = caseStatus ?? 'open'
  const d = detectionStatus ?? 'detected'
  if (d === 'resolved' || d === 'dmca_sent') return true
  if (c === 'resolved' || c === 'waived') return true
  return false
}

/** localStorage-backed “user opened infringing URL”. */
export const LEAK_LINK_OPENED_STORAGE_KEY = 'protection:leak_link_opened:v1'

export function readLeakLinkOpenedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(LEAK_LINK_OPENED_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function markLeakLinkOpened(alertId: string): void {
  if (typeof window === 'undefined') return
  const s = readLeakLinkOpenedIds()
  if (s.has(alertId)) return
  s.add(alertId)
  window.localStorage.setItem(LEAK_LINK_OPENED_STORAGE_KEY, JSON.stringify(Array.from(s)))
}
