import type { LeakAlert, LeakMediaType } from '@/lib/types'

/** Pipeline rows still in inbox triage — do not repeat the empty word “detected”. */
export const OPEN_TRIAGE_STATUSES = new Set(['detected', 'pending', 'reviewing'])

export function isOpenTriageStatus(status: string | undefined): boolean {
  return status != null && OPEN_TRIAGE_STATUSES.has(status)
}

function truncateOneLine(s: string, max: number): string {
  const collapsed = s.replace(/\s+/g, ' ').trim()
  if (!collapsed) return collapsed
  if (collapsed.length <= max) return collapsed
  return `${collapsed.slice(0, Math.max(0, max - 1))}…`
}

/** Human label from `media_type` + coarse triage (`unknown` ⇒ type not settled). */
export function leakContentKindLabel(media?: LeakMediaType): string {
  switch (media) {
    case 'video':
      return 'Video'
    case 'photo':
      return 'Photo'
    case 'unknown':
    default:
      return 'Mixed / unclear'
  }
}

/**
 * Keywords from the leak scan (stored on `query`) or explicit manual ingest.
 * Returns truncated label plus optional tooltip with the full Serper/query string.
 */
export function leakMatchQuerySignal(
  alert: LeakAlert,
): { label: string; title?: string } | null {
  const raw = alert.query?.trim()
  if (raw) {
    const line = truncateOneLine(raw, 56)
    return {
      label: `Match · ${line}`,
      title: raw === line ? undefined : raw,
    }
  }
  if (alert.detected_by === 'user_report') {
    return { label: 'Match · Manual URL', title: 'You pointed Circe at this URL; no search-query terms apply.' }
  }
  return null
}

export function humanizeLeakStatus(status: string): string {
  return status.replace(/_/g, ' ')
}
