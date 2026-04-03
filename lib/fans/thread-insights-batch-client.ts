/**
 * Browser-side loop for POST /api/divine/bulk-refresh-thread-insights until exhausted.
 */
export type ThreadInsightsProgress = (message: string) => void

export async function runAllThreadInsightBatches(
  onProgress?: ThreadInsightsProgress,
  opts?: { batchSize?: number; platform?: 'onlyfans' | 'fansly' },
): Promise<{ totalProcessed: number; totalSkipped: number; error?: string }> {
  const batchSize = opts?.batchSize ?? 15
  const platform = opts?.platform ?? 'onlyfans'
  let offset = 0
  let totalProcessed = 0
  let totalSkipped = 0

  try {
    for (let pass = 0; pass < 500; pass++) {
      const res = await fetch('/api/divine/bulk-refresh-thread-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batchSize, offset, platform }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        processed?: number
        skipped?: number
        nextOffset?: number | null
        errors?: string[]
      }
      if (!res.ok) {
        return { totalProcessed, totalSkipped, error: data.error || `Batch failed (${res.status})` }
      }
      totalProcessed += data.processed ?? 0
      totalSkipped += data.skipped ?? 0
      onProgress?.(
        `Thread insights: +${data.processed ?? 0} this batch (${totalProcessed} total)…`,
      )
      if (data.nextOffset == null) break
      offset = data.nextOffset
    }
    onProgress?.(`Thread insights done: ${totalProcessed} refreshed, ${totalSkipped} skipped.`)
    return { totalProcessed, totalSkipped }
  } catch (e) {
    return {
      totalProcessed,
      totalSkipped,
      error: e instanceof Error ? e.message : 'Thread insights batch failed',
    }
  }
}
