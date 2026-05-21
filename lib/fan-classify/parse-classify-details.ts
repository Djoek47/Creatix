/**
 * Parse `syncFanClassifyForUser` `details[]` strings into structured rows for human-facing UI.
 * Formats are defined in `lib/fan-classify/sync-core.ts`.
 */

export type ClassifyDetailChannel =
  | 'fansly_tags'
  | 'onlyfans_crm'
  | 'onlyfans_api'
  | 'onlyfans_active_chat'
  | 'unknown'

export type ParsedClassifyLine =
  | {
      kind: 'sync'
      segmentKey: string
      channel: ClassifyDetailChannel
      added: number
      removed: number
      target: number
    }
  | {
      kind: 'skip'
      segmentKey: string
      reason: 'disabled' | 'no_list' | 'tag_error' | 'other'
      /** When set, skip referred to OnlyFans vs Fansly path. */
      platform?: 'onlyfans' | 'fansly'
      detail?: string
    }
  | {
      kind: 'info'
      message: string
    }
  | {
      kind: 'raw'
      text: string
    }

const SYNC_RE =
  /^(.+?) \((fansly tags|onlyfans crm|onlyfans api|onlyfans)\): \+(\d+) [\u2212-](\d+) \(target (\d+)\)\s*$/

/** e.g. `skip whale_spend: disabled` */
const SKIP_SIMPLE = /^skip ([a-z0-9_]+): (.+)\s*$/i
/** e.g. `skip recent_sub_3d (onlyfans): no list` */
const SKIP_PLATFORM = /^skip ([a-z0-9_]+) \((onlyfans|fansly)\): (.+)\s*$/i

function channelFromParen(p: string): ClassifyDetailChannel {
  if (p === 'fansly tags') return 'fansly_tags'
  if (p === 'onlyfans crm') return 'onlyfans_crm'
  if (p === 'onlyfans api') return 'onlyfans_api'
  if (p === 'onlyfans') return 'onlyfans_active_chat'
  return 'unknown'
}

function skipReason(detail: string): Extract<ParsedClassifyLine, { kind: 'skip' }>['reason'] {
  const d = detail.trim().toLowerCase()
  if (d === 'disabled') return 'disabled'
  if (d === 'no list') return 'no_list'
  if (d.includes('could not create tag')) return 'tag_error'
  return 'other'
}

export function parseClassifySyncDetails(details: string[]): ParsedClassifyLine[] {
  const out: ParsedClassifyLine[] = []
  for (const line of details) {
    const s = String(line ?? '').trim()
    if (!s) continue

    const syncM = s.match(SYNC_RE)
    if (syncM) {
      const segmentKey = syncM[1].trim()
      const channel = channelFromParen(syncM[2])
      out.push({
        kind: 'sync',
        segmentKey,
        channel,
        added: Number(syncM[3]) || 0,
        removed: Number(syncM[4]) || 0,
        target: Number(syncM[5]) || 0,
      })
      continue
    }

    const skipPl = s.match(SKIP_PLATFORM)
    if (skipPl) {
      const segmentKey = skipPl[1].trim()
      const detail = skipPl[3].trim()
      const platform = skipPl[2].toLowerCase() === 'fansly' ? 'fansly' : 'onlyfans'
      out.push({
        kind: 'skip',
        segmentKey,
        platform,
        reason: skipReason(detail),
        detail,
      })
      continue
    }
    const skipM = s.match(SKIP_SIMPLE)
    if (skipM) {
      const segmentKey = skipM[1].trim()
      const detail = skipM[2].trim()
      out.push({
        kind: 'skip',
        segmentKey,
        reason: skipReason(detail),
        detail,
      })
      continue
    }

    if (s.startsWith('created OF list') || s.startsWith('skipped:')) {
      out.push({ kind: 'info', message: s })
      continue
    }

    out.push({ kind: 'raw', text: s })
  }
  return out
}

export function summarizeClassifyDetails(parsed: ParsedClassifyLine[]): {
  totalAdded: number
  totalRemoved: number
  syncCount: number
  skipCount: number
} {
  let totalAdded = 0
  let totalRemoved = 0
  let syncCount = 0
  let skipCount = 0
  for (const p of parsed) {
    if (p.kind === 'sync') {
      syncCount += 1
      totalAdded += p.added
      totalRemoved += p.removed
    } else if (p.kind === 'skip') {
      skipCount += 1
    }
  }
  return { totalAdded, totalRemoved, syncCount, skipCount }
}
