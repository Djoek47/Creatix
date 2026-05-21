/**
 * Mirrors the Fans header Quick sync — triggers both OnlyFans & Fansly sync POSTs when connected.
 */
export async function postQuickFanPlatformSync(): Promise<void> {
  await Promise.all([
    fetch('/api/onlyfans/sync', { method: 'POST' }),
    fetch('/api/fansly/sync', { method: 'POST' }),
  ])
}
