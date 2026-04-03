/**
 * Browser-side loop for POST /api/onlyfans/scan-chats-to-crm (fetch_page + detail_batch).
 * Used from the Fans page sync menu.
 */
export type ChatScanProgress = (message: string) => void

export async function runOnlyFansFullChatScan(onProgress?: ChatScanProgress): Promise<{
  totalSynced: number
  totalFailed: number
  abortedRateLimit: boolean
  error?: string
}> {
  let convOffset = 0
  let pending: string[] = []
  let chatPagesDone = false
  let totalSynced = 0
  let totalFailed = 0
  let abortedRateLimit = false

  try {
    while (!chatPagesDone || pending.length > 0) {
      if (pending.length === 0) {
        if (chatPagesDone) break
        const res = await fetch('/api/onlyfans/scan-chats-to-crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ step: 'fetch_page', conversationOffset: convOffset }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          fanIds?: string[]
          nextConversationOffset?: number
          done?: boolean
          chatsOnPage?: number
        }
        if (!res.ok) return { totalSynced, totalFailed, abortedRateLimit, error: data.error || `Chat list failed (${res.status})` }
        pending = data.fanIds ?? []
        convOffset = data.nextConversationOffset ?? convOffset
        chatPagesDone = data.done === true
        onProgress?.(
          `DMs: ${data.chatsOnPage ?? 0} threads on this page (${pending.length} profiles to fetch)…`,
        )
        if (pending.length === 0 && chatPagesDone) break
        if (pending.length === 0 && !chatPagesDone) break
        continue
      }

      const res2 = await fetch('/api/onlyfans/scan-chats-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: 'detail_batch',
          platformFanIds: pending,
          batchSize: 12,
        }),
      })
      const d2 = (await res2.json().catch(() => ({}))) as {
        error?: string
        processed?: number
        failed?: number
        remainingFanIds?: string[]
      }
      if (res2.status === 429) {
        abortedRateLimit = true
        onProgress?.(
          d2.error ||
            'OnlyFans rate limit — wait a minute, then run “Full CRM update” again to continue.',
        )
        break
      }
      if (!res2.ok) {
        return {
          totalSynced,
          totalFailed,
          abortedRateLimit,
          error: d2.error || `Fan details failed (${res2.status})`,
        }
      }
      pending = d2.remainingFanIds ?? []
      totalSynced += d2.processed ?? 0
      totalFailed += d2.failed ?? 0
      onProgress?.(
        `CRM from chats: ${totalSynced} updated${totalFailed ? `, ${totalFailed} skipped` : ''}${pending.length ? '…' : ''}`,
      )
    }

    if (!abortedRateLimit) {
      onProgress?.(
        `Chats done: ${totalSynced} profiles${totalFailed ? ` (${totalFailed} errors)` : ''}.`,
      )
    }
    return { totalSynced, totalFailed, abortedRateLimit }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Chat scan failed'
    return { totalSynced, totalFailed, abortedRateLimit, error }
  }
}
