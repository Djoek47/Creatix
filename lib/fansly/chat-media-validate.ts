/**
 * Fansly DMs accept vault / media ids (not raw URLs in place of ids).
 */
export function validateFanslyChatMediaIdsForSend(mediaIds: unknown): string | null {
  if (!Array.isArray(mediaIds) || mediaIds.length === 0) return null
  for (const m of mediaIds) {
    const s = String(m).trim()
    if (!s) continue
    if (/^https?:\/\//i.test(s)) {
      return 'Fansly message media must be media / vault IDs, not HTTP(S) URLs.'
    }
    if (/cdn\d*\.onlyfans\.com/i.test(s) || /onlyfans\.com\/files\//i.test(s)) {
      return 'OnlyFans media IDs cannot be sent on Fansly. Use Fansly media IDs for Fansly recipients.'
    }
  }
  return null
}
