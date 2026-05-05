/**
 * User-facing copy for OnlyFans partner errors during fan classify / list sync.
 */
export function formatClassifyOnlyFansError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('ONLYFANS_SESSION_EXPIRED')) {
    return 'OnlyFans session expired — reconnect OnlyFans in Settings.'
  }
  if (raw.includes('Bad Request - The request could not be understood by the server')) {
    return 'OnlyFans returned a generic Bad Request (often invalid session, missing API permissions for lists, or a temporary partner error). Reconnect OnlyFans in Settings, then try again.'
  }
  if (/ONLYFANS_RATE_LIMIT/i.test(raw)) {
    return 'OnlyFans API rate limited — wait a few minutes and try again.'
  }
  if (raw.includes('ONLYFANS_API_KEY')) {
    return 'OnlyFans API is not configured on the server.'
  }
  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw
}
