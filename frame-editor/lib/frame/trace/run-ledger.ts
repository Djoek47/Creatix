export const RUN_LEDGER_LIMIT = 100

export function capRunLedger<T>(runs: T[], limit = RUN_LEDGER_LIMIT): T[] {
  return runs.slice(0, limit)
}

export function parseStoredRunLedger<T>(raw: string | null, limit = RUN_LEDGER_LIMIT): T[] {
  if (!raw) return []
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) return []
  return capRunLedger(parsed as T[], limit)
}
