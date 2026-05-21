export const TRACE_BATCH_RECIPIENT_LIMIT = 50

export function normalizeTraceBatchRecipientList(values: string[], limit = TRACE_BATCH_RECIPIENT_LIMIT): string[] {
  const recipients = values.map((value) => value.trim()).filter(Boolean)
  return Array.from(new Set(recipients)).slice(0, limit)
}

export function normalizeTraceBatchRecipients(raw: string, limit = TRACE_BATCH_RECIPIENT_LIMIT): string[] {
  return normalizeTraceBatchRecipientList(raw.split(/\r?\n/), limit)
}
