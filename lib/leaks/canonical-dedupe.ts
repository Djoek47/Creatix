import { isLeakStatusActive } from '@/lib/leaks/leak-detection-status'
import type { LeakMediaType } from '@/lib/types'

/** Same canonical URL already tracked — do not insert a new row; skip. */
export function shouldSkipDuplicateScan(status: string | null | undefined): boolean {
  const s = String(status ?? '')
  if (isLeakStatusActive(s)) return true
  if (s === 'dmca_sent') return true
  if (s === 'ignored' || s === 'false_positive' || s === 'scam') return true
  if (s === 'reviewed' || s === 'confirmed') return true
  return false
}

/** Same canonical URL was closed as handled — scan may reopen this row. */
export function canReopenResolvedLeak(status: string | null | undefined): boolean {
  return String(status ?? '') === 'resolved'
}

export function inferMediaTypeFromUrl(url: string): LeakMediaType {
  const lower = url.toLowerCase()
  if (/\.(mp4|webm|mov|m3u8|mkv)(\?|$)/i.test(lower) || /\/video\//i.test(lower) || /\/videos\//i.test(lower)) {
    return 'video'
  }
  if (/\.(jpg|jpeg|png|gif|webp|heic)(\?|$)/i.test(lower) || /\/photo\//i.test(lower) || /\/image\//i.test(lower)) {
    return 'photo'
  }
  return 'unknown'
}
