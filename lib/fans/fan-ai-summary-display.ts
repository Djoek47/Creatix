/**
 * Normalize OnlyFansAPI / DB fan summary payloads for the Fans UI (no raw JSON).
 */

export type FanSummaryDisplay = {
  status: string
  isProcessing: boolean
  isFailed: boolean
  errorMessage: string | null
  analyzedMessageCount: number | null
  lastAnalyzedAt: string | null
  /** Non-empty summary fields for display */
  fields: { key: string; label: string; value: string }[]
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Prefer nested API shape { data: { status, summary_data, ... } } */
function pickSummaryRoot(raw: unknown): Record<string, unknown> | null {
  const top = asRecord(raw)
  if (!top) return null
  const inner = asRecord(top.data)
  if (inner && (inner.summary_data !== undefined || inner.status !== undefined || inner.analyzed_message_count !== undefined)) {
    return inner
  }
  return top
}

function collectSummaryFields(summaryData: Record<string, unknown>): { key: string; label: string; value: string }[] {
  const out: { key: string; label: string; value: string }[] = []
  for (const [key, v] of Object.entries(summaryData)) {
    if (v == null) continue
    const s = typeof v === 'string' ? v.trim() : String(v).trim()
    if (!s) continue
    out.push({ key, label: formatFieldLabel(key), value: s })
  }
  return out
}

export function parseFanSummaryForDisplay(raw: unknown, apiPending: boolean): FanSummaryDisplay {
  const root = pickSummaryRoot(raw)
  const statusRaw = root ? String(root.status ?? '').toLowerCase() : ''
  const errorMessage =
    root && typeof root.error_message === 'string' && root.error_message.trim()
      ? root.error_message.trim()
      : null

  const analyzedMessageCount =
    root && typeof root.analyzed_message_count === 'number' && Number.isFinite(root.analyzed_message_count)
      ? root.analyzed_message_count
      : null

  const lastAnalyzedAt =
    root && typeof root.last_analyzed_at === 'string' && root.last_analyzed_at.trim()
      ? root.last_analyzed_at.trim()
      : null

  const sd = root ? asRecord(root.summary_data) : null
  let fields: { key: string; label: string; value: string }[] = []
  if (sd) {
    fields = collectSummaryFields(sd)
  } else if (root) {
    const skip = new Set([
      'status',
      'summary_data',
      'data',
      'analyzed_message_count',
      'last_analyzed_at',
      'error_message',
    ])
    const loose: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(root)) {
      if (skip.has(k)) continue
      loose[k] = v
    }
    fields = collectSummaryFields(loose)
  }

  const isFailed = statusRaw === 'failed' || statusRaw === 'error' || Boolean(errorMessage)

  const isProcessing =
    !isFailed &&
    (apiPending || statusRaw === 'processing' || statusRaw === 'pending')

  return {
    status: statusRaw || (apiPending ? 'pending' : fields.length ? 'completed' : 'unknown'),
    isProcessing,
    isFailed,
    errorMessage,
    analyzedMessageCount,
    lastAnalyzedAt,
    fields,
  }
}
